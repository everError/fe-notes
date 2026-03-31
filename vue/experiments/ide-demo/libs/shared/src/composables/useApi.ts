import { inject } from 'vue';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { ApiResponse, FileResponse, ResultSet } from '../types/api';
import { useLoading } from './useLoading';
import { WEB_KEY } from '../plugins/keys';

/**
 * Blob 응답에서 파일 정보를 추출합니다.
 * Content-Disposition 헤더에서 파일명을 파싱하며,
 * UTF-8 인코딩된 파일명(한글 등)을 우선 처리합니다.
 */
function parseFileResponse(response: AxiosResponse): FileResponse {
  const contentDisposition = response.headers['content-disposition'];
  let fileName = 'downloaded_file';

  if (contentDisposition) {
    // UTF-8 인코딩 파일명 우선 (한글 지원)
    const utf8Match = contentDisposition.match(
      /filename\*=UTF-8''(.+?)(?:;|$)/i,
    );
    if (utf8Match) {
      fileName = decodeURIComponent(utf8Match[1]);
    } else {
      // 일반 filename 파싱 (fallback)
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/i);
      if (match) fileName = match[1];
    }
  }

  return {
    fileName,
    fileExtension: fileName.split('.').pop() || '',
    fileSize: response.headers['content-length'],
    file: response.data,
  };
}

/**
 * 서버 응답을 ResultSet 포맷으로 파싱합니다.
 *
 * - ResultSet 포맷: { metadata: { success, message }, data }
 * - metadata가 없으면 원본 데이터를 그대로 반환 (성공 처리)
 * - 실패 시 에러 메시지를 파싱하여 onError 콜백 호출
 *   (서버가 JSON 배열로 에러 코드를 보내는 경우 첫 번째 메시지만 표시)
 */
function parseResultSet<T>(
  data: unknown,
  showError: boolean,
  onError?: (message: string) => void,
): ApiResponse<T> {
  const resultSet = data as ResultSet<T>;

  // ResultSet 포맷이 아니면 원본 반환
  if (!resultSet?.metadata) {
    return { success: true, data: data as T };
  }

  // 성공
  if (resultSet.metadata.success) {
    return { success: true, data: resultSet.data };
  }

  // 실패 — 에러 메시지 처리
  if (showError && resultSet.metadata.message) {
    try {
      // 서버가 ["에러코드1", "에러코드2"] 형태로 보내는 경우
      const messages = JSON.parse(resultSet.metadata.message);
      const firstMessage = Array.isArray(messages) ? messages[0] : messages;
      onError?.(firstMessage);
    } catch {
      // JSON 파싱 실패 시 원본 메시지 그대로 사용
      onError?.(resultSet.metadata.message);
    }
  }

  return { success: false, data: undefined };
}

/**
 * HTTP API 클라이언트 composable.
 * createWeb 플러그인의 설정(baseURL, 인증 등)을 inject하여 사용합니다.
 *
 * - 인증 토큰 자동 세팅 및 갱신
 * - ResultSet 응답 자동 파싱
 * - Blob 파일 다운로드 지원
 * - FormData 자동 감지 (Content-Type 제거)
 * - AbortSignal 지원 (요청 취소)
 * - 글로벌/인스턴스별 로딩 상태
 *
 * @example
 * ```ts
 * const api = useApi();
 *
 * // GET
 * const { success, data } = await api.get<Item[]>('/api/items', { keyword: '볼트' });
 *
 * // POST
 * const result = await api.post('/api/items', { itemNo: 'A001' });
 *
 * // 로딩 상태
 * api.loading // 이 인스턴스의 요청 로딩
 * ```
 */
export function useApi() {
  const config = inject(WEB_KEY);
  if (!config)
    throw new Error('[useApi] createWeb 플러그인이 설치되지 않았습니다.');

  // 인스턴스별 로딩 + 글로벌 로딩 카운터 연동
  const { loading, start, end } = useLoading();

  // axios 인스턴스 — baseURL과 기본 헤더 설정
  const client = axios.create({
    baseURL: config.apiBaseUrl,
    headers: { 'Content-Type': 'application/json' },
  });

  /**
   * 인증 토큰 확보.
   *
   * auth 방식: createWeb에서 auth의 콜백을 자동 연결해주므로
   * 기존 콜백 방식과 동일하게 동작합니다.
   *
   * 1. shouldRefreshToken()이 true면 refreshToken() 호출
   * 2. 아니면 getAccessToken()으로 현재 토큰 반환
   * 3. 토큰을 얻지 못하면 null 반환 → 에러 처리
   */
  const ensureAuth = async (): Promise<string | null> => {
    // 갱신 필요 여부 체크
    if (config.shouldRefreshToken?.()) {
      const newToken = await config.refreshToken?.();
      if (!newToken) return null;
      return newToken;
    }

    // 현재 토큰 반환 (getAccessToken이 없으면 null)
    const token = await Promise.resolve(config.getAccessToken?.() ?? null);
    return token;
  };

  /**
   * 공통 HTTP 요청 실행.
   * 인증 → 요청 → 응답 파싱 → 에러 처리 흐름을 통합합니다.
   *
   * @param method - HTTP 메서드
   * @param url - 엔드포인트 경로 (baseURL 기준 상대 경로)
   * @param payload - GET은 query params, 나머지는 request body
   * @param options - signal, showError, responseType 등 부가 옵션
   */
  const request = async <T = unknown>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    payload?: unknown,
    options?: {
      /** 요청 취소용 AbortSignal */
      signal?: AbortSignal;
      /** 에러 발생 시 다이얼로그 표시 여부 (기본: true) */
      showError?: boolean;
      /** 응답 타입 — 'blob'이면 파일 다운로드 처리 */
      responseType?: 'json' | 'blob';
      /** 인증 헤더 생략 — 로그인 등 토큰 없이 호출할 때 사용 (기본: false) */
      skipAuth?: boolean;
    },
  ): Promise<ApiResponse<T>> => {
    const {
      signal,
      showError = true,
      responseType = 'json',
      skipAuth = false,
    } = options ?? {};

    start();
    try {
      // 1. 인증 토큰 확보 (skipAuth면 건너뜀)
      const headers: Record<string, string> = {};
      if (!skipAuth) {
        const token = await ensureAuth();
        if (token === null) {
          config.onError?.('접근 권한이 없습니다. 로그인 후 이용해주세요.');
          return { success: false, data: undefined };
        }
        headers.Authorization = `Bearer ${token}`;
      }

      // 2. axios 요청 설정 조립
      const axiosConfig: AxiosRequestConfig = {
        method,
        url,
        headers,
        signal,
        responseType,
        ...(method === 'get' ? { params: payload } : { data: payload }),
      };

      // 3. FormData인 경우 Content-Type 제거 → axios가 multipart/form-data 자동 설정
      if (payload instanceof FormData) {
        delete axiosConfig.headers!['Content-Type'];
      }

      // 4. 요청 실행
      const response = await client(axiosConfig);

      // 5a. Blob 응답 → 파일 정보 추출
      if (responseType === 'blob') {
        return { success: true, data: parseFileResponse(response) as T };
      }

      // 5b. JSON 응답 → ResultSet 파싱
      return parseResultSet<T>(response.data, showError, config.onError);
    } catch (error: any) {
      if (axios.isCancel(error)) return { success: false, data: undefined };
      if (showError)
        config.onError?.('오류가 발생했습니다. 관리자에게 문의하세요.');
      return { success: false, data: undefined };
    } finally {
      end();
    }
  };

  return {
    /** 이 useApi 인스턴스의 요청 로딩 상태 */
    loading,

    /** GET 요청 */
    get: <T = unknown>(
      url: string,
      params?: unknown,
      options?: Parameters<typeof request>[3],
    ) => request<T>('get', url, params, options),

    /** POST 요청 */
    post: <T = unknown>(
      url: string,
      data?: unknown,
      options?: Parameters<typeof request>[3],
    ) => request<T>('post', url, data, options),

    /** PUT 요청 */
    put: <T = unknown>(
      url: string,
      data?: unknown,
      options?: Parameters<typeof request>[3],
    ) => request<T>('put', url, data, options),

    /** DELETE 요청 */
    delete: <T = unknown>(
      url: string,
      data?: unknown,
      options?: Parameters<typeof request>[3],
    ) => request<T>('delete', url, data, options),
  };
}
