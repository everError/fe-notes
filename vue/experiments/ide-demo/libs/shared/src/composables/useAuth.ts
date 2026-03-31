import { ref, computed, inject } from 'vue';
import { jwtDecode } from 'jwt-decode';
import type {
  AuthOptions,
  AuthInstance,
  AuthUser,
  LoginRequest,
  LoginResponse,
} from '../types/auth';
import { AUTH_KEY } from '../plugins/keys';

/**
 * JWT 토큰에서 추출할 claims 구조
 * - exp: 만료 시각 (unix timestamp, 초 단위)
 * - MemberKey: 서버에서 발급 시 포함하는 사용자 식별 키
 */
interface JwtClaims {
  exp: number;
  MemberKey?: string;
  [key: string]: unknown;
}

/**
 * 인증 관리 인스턴스를 생성합니다.
 *
 * - Access Token은 메모리(ref)에 저장 → 새로고침 시 유실 (의도된 동작)
 * - Refresh Token은 서버가 httpOnly 쿠키로 관리 → 클라이언트에서 접근 불가
 * - JWT exp 기반 setTimeout으로 만료 전 자동 갱신
 * - WebSocket 갱신 우선, 실패 시 REST fallback
 *
 * @example
 * ```typescript
 * // 앱 초기화 시 (main.ts)
 * const auth = createAuth({
 *   onAuthFailure: () => router.push('/login'),
 * });
 * app.use(createWeb({ auth }));
 *
 * // 컴포넌트에서
 * const { user, isAuthenticated, login, logout } = useAuth();
 * await login({ id: 'admin', password: '1234' });
 * ```
 */
export function createAuth(options: AuthOptions = {}): AuthInstance {
  const {
    loginUrl = '/std/common/auth/login',
    refreshUrl = '/std/common/auth/login-with-refresh',
    logoutUrl = '/std/common/auth/logout',
    refreshThreshold = 60, // 만료 60초 전에 갱신 시도
    onAuthFailure,
  } = options;

  // ========================================
  // 내부 상태 (메모리 — 새로고침 시 초기화됨)
  // ========================================

  /** 현재 access token (Bearer 인증에 사용) */
  const accessToken = ref<string | null>(null);

  /** 인증된 사용자 정보 */
  const user = ref<AuthUser | null>(null);

  /** accessToken 존재 여부로 인증 상태 판단 */
  const isAuthenticated = computed(() => !!accessToken.value);

  /** 자동 갱신 타이머 핸들 (clearTimeout용) */
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * WebSocket 토큰 갱신 함수
   * - useWebSocket.connect() 성공 후 registerWsRefresher()로 등록됨
   * - 순환 의존 방지: useAuth는 useWebSocket을 직접 import하지 않음
   */
  let wsRefresher: (() => Promise<string | null>) | null = null;

  /** API base URL (createWeb에서 설정) */
  let baseUrl = '';

  /**
   * API base URL 설정
   * createWeb 플러그인 install 시 호출됨
   */
  const setBaseUrl = (url: string) => {
    baseUrl = url;
  };

  // ========================================
  // JWT 토큰 유틸리티
  // ========================================

  /**
   * JWT 토큰을 디코딩하여 claims를 추출합니다.
   * 유효하지 않은 토큰이면 null 반환
   */
  const decodeClaims = (token: string): JwtClaims | null => {
    try {
      return jwtDecode<JwtClaims>(token);
    } catch {
      return null;
    }
  };

  /**
   * 현재 access token의 만료까지 남은 시간(초)을 반환합니다.
   * 토큰이 없거나 exp가 없으면 0
   */
  const expiresIn = (): number => {
    if (!accessToken.value) return 0;
    const claims = decodeClaims(accessToken.value);
    if (!claims?.exp) return 0;
    return claims.exp - Math.floor(Date.now() / 1000);
  };

  /**
   * 토큰 갱신이 필요한지 판단합니다.
   * 만료까지 남은 시간이 refreshThreshold(기본 60초) 이하면 true
   */
  const shouldRefresh = (): boolean => {
    return expiresIn() <= refreshThreshold;
  };

  // ========================================
  // 내부 상태 관리
  // ========================================

  /**
   * 로그인/토큰복원 응답으로 전체 상태를 설정합니다.
   * - access token 저장
   * - JWT claims에서 사용자 정보 추출
   * - 자동 갱신 타이머 설정
   */
  const applyLoginResponse = (response: LoginResponse) => {
    if (!response.token) return;

    accessToken.value = response.token;

    // JWT claims에서 memberKey 추출
    const claims = decodeClaims(response.token);
    user.value = {
      userId: response.userId ?? '',
      username: response.username ?? '',
      memberKey: claims?.MemberKey ? Number(claims.MemberKey) : undefined,
    };

    scheduleRefresh();
  };

  /**
   * 토큰만 갱신합니다. (WebSocket 갱신 시 사용)
   * 서버가 token만 반환하므로 user 정보는 유지하고 토큰만 교체합니다.
   */
  const applyTokenOnly = (token: string) => {
    accessToken.value = token;

    // memberKey가 변경될 수 있으므로 갱신
    const claims = decodeClaims(token);
    if (claims?.MemberKey && user.value) {
      user.value.memberKey = Number(claims.MemberKey);
    }

    scheduleRefresh();
  };

  /**
   * 인증 상태를 완전히 초기화합니다.
   * 갱신 타이머도 함께 제거됩니다.
   */
  const clearToken = () => {
    accessToken.value = null;
    user.value = null;

    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  };

  /**
   * JWT exp 기반으로 자동 갱신 타이머를 설정합니다.
   *
   * 만료 N초(refreshThreshold) 전에 refreshAccessToken()을 호출하여
   * 라우터/API 호출에 의존하지 않고 자동으로 토큰을 갱신합니다.
   *
   * 예: exp까지 300초 남음, threshold 60초 → 240초 후 갱신 시도
   */
  const scheduleRefresh = () => {
    // 기존 타이머 제거
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    const remaining = expiresIn();
    if (remaining <= 0) return;

    // 만료 threshold초 전에 갱신 (최소 0ms)
    const delay = Math.max((remaining - refreshThreshold) * 1000, 0);

    refreshTimer = setTimeout(async () => {
      const success = await refreshAccessToken();
      if (!success) {
        // 갱신 실패 → 인증 상태 클리어 + 콜백 (로그인 페이지 이동 등)
        clearToken();
        onAuthFailure?.();
      }
    }, delay);
  };

  // ========================================
  // REST 요청 (fetch 사용)
  // ========================================

  /**
   * 인증 관련 REST 요청을 수행합니다.
   *
   * axios 대신 fetch를 사용하는 이유:
   * - useApi가 useAuth를 의존하므로, useAuth에서 axios(useApi)를 쓰면 순환 의존
   * - credentials: 'include'로 httpOnly 쿠키 자동 전송
   *
   * @param url - API 경로 (baseUrl이 앞에 붙음)
   * @param opts.method - HTTP 메서드 (기본: POST)
   * @param opts.body - 요청 본문 (JSON 직렬화됨)
   * @param opts.withAuth - Authorization 헤더 포함 여부
   * @returns 파싱된 응답 데이터 또는 null
   */
  const restRequest = async <T>(
    url: string,
    opts?: { method?: string; body?: unknown; withAuth?: boolean },
  ): Promise<T | null> => {
    const { method = 'POST', body, withAuth = false } = opts ?? {};

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 인증이 필요한 요청 (예: 로그아웃)
      if (withAuth && accessToken.value) {
        headers['Authorization'] = `Bearer ${accessToken.value}`;
      }

      const response = await fetch(`${baseUrl}${url}`, {
        method,
        headers,
        credentials: 'include', // httpOnly 쿠키 전송
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) return null;

      const result = await response.json();

      // BFF의 ResultSet 래퍼 처리: { metadata: { success }, data }
      if (result?.metadata?.success) {
        return result.data as T;
      }
      if (result?.metadata && !result.metadata.success) {
        return null;
      }

      // ResultSet이 아닌 직접 응답
      if (result && !result.metadata) {
        return result as T;
      }

      return null;
    } catch {
      return null;
    }
  };

  // ========================================
  // 공개 API
  // ========================================

  /**
   * ID/PW로 로그인합니다.
   *
   * POST /std/common/auth/login
   * - 성공: access token 메모리 저장 + refresh token httpOnly 쿠키(서버 세팅)
   * - 실패: false 반환
   */
  const login = async (request: LoginRequest): Promise<boolean> => {
    const data = await restRequest<LoginResponse>(loginUrl, {
      body: { id: request.id, password: request.password },
    });

    if (!data?.token) return false;

    applyLoginResponse(data);
    return true;
  };

  /**
   * httpOnly 쿠키의 refresh token으로 access token을 복원합니다.
   *
   * POST /std/common/auth/login-with-refresh
   * - 새로고침/초기 접근 시 호출 (WebSocket 연결 전)
   * - 쿠키가 자동 전송되므로 body 없음
   * - 성공: 상태 복원 + 갱신 타이머 설정
   * - 실패: false (쿠키 만료 등 → 재로그인 필요)
   */
  const tryRestore = async (): Promise<boolean> => {
    const data = await restRequest<LoginResponse>(refreshUrl);

    if (!data?.token) return false;

    applyLoginResponse(data);
    return true;
  };

  /**
   * access token을 갱신합니다.
   *
   * 갱신 전략 (우선순위):
   * 1. WebSocket 메시지로 갱신 (이미 연결되어 있으면)
   * 2. REST fallback (WebSocket 미연결 또는 실패 시)
   *
   * scheduleRefresh()의 타이머에서 자동 호출되며,
   * 수동으로도 호출할 수 있습니다.
   */
  const refreshAccessToken = async (): Promise<boolean> => {
    // 1. WebSocket 갱신 시도 (연결되어 있으면)
    if (wsRefresher) {
      try {
        const newToken = await wsRefresher();
        if (newToken) {
          applyTokenOnly(newToken);
          return true;
        }
      } catch {
        // WS 실패 → REST fallback으로 이어짐
      }
    }

    // 2. REST fallback (쿠키 기반)
    return await tryRestore();
  };

  /**
   * WebSocket 토큰 갱신 함수를 등록합니다.
   *
   * useWebSocket.connect() 성공 후 내부에서 호출되며,
   * 이후 refreshAccessToken()에서 WS 갱신을 우선 시도합니다.
   *
   * 이 패턴으로 useAuth ↔ useWebSocket 순환 의존을 해결합니다:
   * - useAuth는 useWebSocket을 import하지 않음
   * - useWebSocket이 연결 후 갱신 함수를 주입함
   */
  const registerWsRefresher = (fn: () => Promise<string | null>) => {
    wsRefresher = fn;
  };

  /**
   * 로그아웃합니다.
   *
   * DELETE /std/common/auth/logout
   * - 서버: refresh token 쿠키 삭제 + DB 토큰 무효화
   * - 클라이언트: 메모리 상태 클리어 + onAuthFailure 콜백
   * - 서버 요청 실패해도 클라이언트 상태는 반드시 클리어
   */
  const logout = async () => {
    try {
      await restRequest(logoutUrl, {
        method: 'DELETE',
        withAuth: true,
      });
    } catch {
      // 서버 실패와 무관하게 클라이언트 상태 클리어
    }

    clearToken();
    onAuthFailure?.();
  };

  // ========================================
  // 반환
  // ========================================

  return {
    // 반응형 상태
    user,
    isAuthenticated:
      isAuthenticated as unknown as AuthInstance['isAuthenticated'],
    accessToken,

    // 인증 액션
    login,
    logout,
    tryRestore,
    refreshAccessToken,

    // WebSocket 연동
    registerWsRefresher,

    // 토큰 상태 조회
    expiresIn,
    shouldRefresh,

    // useApi 하위 호환 (createWeb에서 콜백으로 연결)
    getAccessToken: () => accessToken.value,
    shouldRefreshToken: () => shouldRefresh(),

    // 내부용 (createWeb에서 baseUrl 설정)
    _setBaseUrl: setBaseUrl,
  } as AuthInstance & { _setBaseUrl: (url: string) => void };
}

/**
 * 인증 composable을 사용합니다.
 *
 * createWeb({ auth })로 등록된 AuthInstance를 inject합니다.
 * 컴포넌트의 setup() 내에서만 호출 가능합니다.
 *
 * @throws auth가 등록되지 않은 경우 에러
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 *
 * const { user, isAuthenticated, login, logout } = useAuth();
 *
 * const onLogin = async () => {
 *   const success = await login({ id: 'admin', password: '1234' });
 *   if (!success) alert('로그인 실패');
 * };
 * </script>
 * ```
 */
export function useAuth(): AuthInstance {
  const auth = inject(AUTH_KEY);
  if (!auth) {
    throw new Error('[useAuth] createWeb({ auth })로 auth를 등록해주세요.');
  }
  return auth;
}
