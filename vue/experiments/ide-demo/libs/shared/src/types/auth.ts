import type { Ref } from "vue";

/** 로그인 요청 */
export interface LoginRequest {
  id: string;
  password: string;
}

/** 로그인 응답 (기존 BFF 포맷) */
export interface LoginResponse {
  token: string | null;
  username: string | null;
  userId: string | null;
}

/** 인증된 사용자 정보 */
export interface AuthUser {
  userId: string;
  username: string;
  memberKey?: number; // JWT claims
}

/** createAuth 옵션 */
export interface AuthOptions {
  /** 로그인 API 경로 (기본: '/std/common/auth/login') */
  loginUrl?: string;
  /** 토큰 복원 API 경로 (기본: '/std/common/auth/login-with-refresh') */
  refreshUrl?: string;
  /** 로그아웃 API 경로 (기본: '/std/common/auth/logout') */
  logoutUrl?: string;
  /** access token 만료 N초 전에 갱신 시도 (기본: 60) */
  refreshThreshold?: number;
  /** 인증 실패 시 콜백 */
  onAuthFailure?: () => void;
  /** WebSocket 토큰 갱신 메시지 타입 (기본: 'user') */
  wsRefreshType?: string;
  /** WebSocket 토큰 갱신 Json (기본: '{"action":"token"}') */
  wsRefreshJson?: string;
}

/** useAuth 반환 타입 */
export interface AuthInstance {
  user: Ref<AuthUser | null>;
  isAuthenticated: Ref<boolean>;
  accessToken: Ref<string | null>;

  login: (request: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  tryRestore: () => Promise<boolean>;
  refreshAccessToken: () => Promise<boolean>;
  registerWsRefresher: (fn: () => Promise<string | null>) => void;
  expiresIn: () => number;
  shouldRefresh: () => boolean;

  /** useApi 하위 호환 */
  getAccessToken: () => string | null;
  shouldRefreshToken: () => boolean;
}
