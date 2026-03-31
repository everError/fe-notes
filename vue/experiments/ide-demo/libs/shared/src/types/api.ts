import type { AuthInstance, AuthOptions } from './auth';
import type { WebSocketInstance, WebSocketOptions } from './ws';

/** API 응답 래퍼 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | undefined;
}

/**
 * 서버 ResultSet 응답 포맷
 * BFF에서 모든 응답을 이 구조로 래핑하여 반환합니다.
 */
export interface ResultSet<T = unknown> {
  metadata: {
    success: boolean;
    message?: string;
  };
  data: T;
}

/** 파일 다운로드 응답 (Blob + Content-Disposition 파싱 결과) */
export interface FileResponse {
  fileName: string;
  fileExtension: string;
  fileSize?: string;
  file: Blob;
}

/**
 * createWeb 플러그인 옵션
 *
 * 앱의 main.ts에서 createWeb()에 전달합니다.
 *
 * @example
 * ```typescript
 * // 새 방식 (auth 객체 전달)
 * const auth = createAuth({ onAuthFailure: () => router.push('/login') });
 * app.use(createWeb({ auth }));
 *
 * // 기존 방식 (콜백 직접 전달 — 하위 호환)
 * app.use(createWeb({
 *   apiBaseUrl: '/api',
 *   getAccessToken: () => store.token,
 * }));
 * ```
 */
export interface WebOptions {
  /** API base URL (기본: '') */
  apiBaseUrl?: string;

  // ── 새 방식: auth 인스턴스 ──

  /**
   * createAuth()로 생성한 인증 인스턴스
   * 전달하면 getAccessToken/refreshToken/shouldRefreshToken은 무시됩니다.
   */
  auth?: AuthInstance;
  ws?: WebSocketInstance;
  /** WebSocket 연결 옵션 (auth가 있을 때만 유효) */
  wsOptions?: WebSocketOptions;

  // ── 기존 방식: 콜백 직접 전달 (하위 호환) ──

  /** 액세스 토큰 반환 함수 */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** 토큰 갱신 함수. null 반환 시 인증 실패 처리 */
  refreshToken?: () => Promise<string | null>;
  /** 토큰 갱신 필요 여부 판단 */
  shouldRefreshToken?: () => boolean;

  // ── 공통 ──

  /** 인증 실패 시 리다이렉트 경로 (기본: '/login') */
  loginRoute?: string;
  /** 에러 발생 시 커스텀 핸들러 (토스트 표시 등) */
  onError?: (message: string) => void;
}
