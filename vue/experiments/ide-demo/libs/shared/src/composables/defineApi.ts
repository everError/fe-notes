import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { useQueryClient, useQuery, useMutation } from '@tanstack/vue-query';
import { useApi } from './useApi';
import type { ApiResponse } from '../types/api';

/** 엔드포인트 정의 시 공통 옵션 */
export interface EndpointOptions {
  /** 인증 헤더 생략 — 로그인 등 토큰 없이 호출할 때 (기본: false) */
  skipAuth?: boolean;
}

/** fetch 호출 시 추가 옵션 */
export interface FetchOptions {
  /** 인증 헤더 생략 (정의 시점 옵션을 오버라이드) */
  skipAuth?: boolean;
}

/** GET 조회 핸들 */
export interface QueryHandle<T> {
  /** 반응형 데이터 — 조회 성공 시 자동 업데이트 */
  data: ComputedRef<T | undefined>;
  /** 현재 요청 진행 중 여부 */
  loading: Ref<boolean>;
  /** 마지막 요청의 에러 객체 (없으면 null) */
  error: Ref<Error | null>;
  /** params를 넘겨서 조회 실행. 이전 params는 덮어씀 */
  fetch: (params?: unknown, options?: FetchOptions) => Promise<ApiResponse<T>>;
  /** 마지막 fetch에 사용한 params로 재조회 */
  refetch: () => Promise<void>;
  /** TanStack Query 캐시 무효화 (다음 접근 시 자동 refetch 유도) */
  invalidate: () => Promise<void>;
}

/**
 * POST/PUT/DELETE 실행 핸들.
 * 함수로 직접 호출하면서 .loading, .error 속성도 접근 가능합니다.
 *
 * @example
 * ```ts
 * const result = await addItem(formData); // 함수 호출
 * addItem.loading // 로딩 상태 접근
 * ```
 */
export interface MutationHandle<TData, TParams> {
  /** params를 받아 API 요청 실행 */
  (params: TParams): Promise<ApiResponse<TData>>;
  /** 현재 요청 진행 중 여부 */
  loading: Ref<boolean>;
  /** 마지막 요청의 에러 객체 (없으면 null) */
  error: Ref<Error | null>;
}

/** defineApi 콜백에 전달되는 API 빌더 */
export interface ApiBuilder {
  /** GET 엔드포인트 정의 — 조회용 QueryHandle 반환 */
  get: <T>(url: string, options?: EndpointOptions) => QueryHandle<T>;
  /** POST 엔드포인트 정의 — 생성용 MutationHandle 반환 */
  post: <TParams = unknown, TData = void>(
    url: string,
    options?: EndpointOptions,
  ) => MutationHandle<TData, TParams>;
  /** PUT 엔드포인트 정의 — 수정용 MutationHandle 반환 */
  put: <TParams = unknown, TData = void>(
    url: string,
    options?: EndpointOptions,
  ) => MutationHandle<TData, TParams>;
  /** DELETE 엔드포인트 정의 — 삭제용 MutationHandle 반환 */
  delete: <TParams = unknown, TData = void>(
    url: string,
    options?: EndpointOptions,
  ) => MutationHandle<TData, TParams>;
}

/** QueryHandle | MutationHandle 통합 타입 (내부용) */
type AnyHandle = QueryHandle<any> | MutationHandle<any, any>;

/** queryKey 중복 방지를 위한 글로벌 카운터 */
let keyCounter = 0;

/**
 * GET용 QueryHandle 생성.
 * useQuery를 래핑하되 enabled: false로 자동 fetch를 막고,
 * fetch() 호출 시에만 실행되도록 합니다.
 *
 * @param endpointOpts - 정의 시점 옵션 (skipAuth 등)
 */
function createQueryHandle<TData>(
  url: string,
  api: ReturnType<typeof useApi>,
  queryClient: ReturnType<typeof useQueryClient>,
  endpointOpts?: EndpointOptions,
): QueryHandle<TData> {
  // url + 카운터 조합으로 고유 queryKey 생성
  const key = [`get:${url}`, ++keyCounter] as const;

  // fetch() 호출 시 전달받은 params를 저장 — refetch 시 재사용
  const lastParams = ref<unknown>(undefined);

  // fetch() 호출 시 전달받은 옵션 저장 — refetch 시 재사용
  const lastFetchOpts = ref<FetchOptions | undefined>(undefined);

  /** 정의 시점 + 호출 시점 옵션 병합하여 skipAuth 결정 */
  const resolveSkipAuth = (fetchOpts?: FetchOptions): boolean => {
    return fetchOpts?.skipAuth ?? endpointOpts?.skipAuth ?? false;
  };

  // useQuery 등록 — enabled: false로 자동 fetch 방지
  const query = useQuery({
    queryKey: [...key],
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const result = await api.get<TData>(url, lastParams.value, {
        signal,
        skipAuth: resolveSkipAuth(lastFetchOpts.value),
      });
      return result;
    },
    enabled: false, // fetch()로만 실행
    retry: 0,
  });

  // useQuery의 raw 응답(ApiResponse)에서 실제 데이터만 추출
  const data = computed(() => {
    const raw = query.data.value as ApiResponse<TData> | undefined;
    return raw?.success ? raw.data : undefined;
  });

  // Ref 래핑 — useQuery 반환값이 reactive object라 computed로 감싸야 Ref 호환
  const loading = computed(() => query.isFetching.value);
  const error = computed(() => query.error.value ?? null);

  return {
    data: data as ComputedRef<TData | undefined>,
    loading: loading as unknown as Ref<boolean>,
    error: error as unknown as Ref<Error | null>,

    /** params와 옵션을 저장하고 useQuery의 refetch 실행 */
    fetch: async (
      params?: unknown,
      options?: FetchOptions,
    ): Promise<ApiResponse<TData>> => {
      lastParams.value = params;
      lastFetchOpts.value = options;
      const result = await query.refetch();
      const response = result.data as ApiResponse<TData> | undefined;
      return response ?? { success: false, data: undefined };
    },

    /** 마지막 params + 옵션 그대로 재조회 */
    refetch: async (): Promise<void> => {
      await query.refetch();
    },

    /** 캐시 무효화 — staleTime 만료 시 자동 refetch 유도 */
    invalidate: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: [...key] });
    },
  };
}

/**
 * POST/PUT/DELETE용 MutationHandle 생성.
 * useMutation을 래핑하고, 반환값을 "호출 가능한 함수 + 속성" 형태로 만듭니다.
 *
 * @param endpointOpts - 정의 시점 옵션 (skipAuth 등)
 */
function createMutationHandle<TData, TParams>(
  method: 'post' | 'put' | 'delete',
  url: string,
  api: ReturnType<typeof useApi>,
  endpointOpts?: EndpointOptions,
): MutationHandle<TData, TParams> {
  // useMutation 등록 — mutationFn에서 useApi의 해당 메서드 호출
  const mutation = useMutation({
    mutationFn: async (params: unknown) => {
      const result = await api[method]<TData>(url, params, {
        skipAuth: endpointOpts?.skipAuth ?? false,
      });
      return result;
    },
  });

  // Ref 래핑
  const loading = computed(() => mutation.isPending.value);
  const error = computed(() => mutation.error.value ?? null);

  /**
   * 실행 함수 — addItem(formData) 형태로 호출.
   * 내부에서 mutateAsync를 호출하고, 에러 시 { success: false } 반환.
   */
  const execute = async (params: TParams): Promise<ApiResponse<TData>> => {
    try {
      const result = await mutation.mutateAsync(params);
      return result as ApiResponse<TData>;
    } catch {
      return { success: false, data: undefined };
    }
  };

  // execute 함수 자체에 loading, error 속성을 부여하여
  // addItem(data) 호출도 되고 addItem.loading 접근도 가능하게 함
  const handle = execute as MutationHandle<TData, TParams>;
  Object.defineProperty(handle, 'loading', {
    get: () => loading,
    enumerable: true,
  });
  Object.defineProperty(handle, 'error', {
    get: () => error,
    enumerable: true,
  });

  return handle;
}

/**
 * API 엔드포인트를 선언적으로 정의하고 Vue composable로 반환합니다.
 *
 * - GET → QueryHandle (조회, 캐싱, refetch)
 * - POST/PUT/DELETE → MutationHandle (실행 함수 + 로딩/에러)
 * - 내부적으로 TanStack Query를 사용하여 캐싱/중복 요청 방지
 * - createWeb 플러그인이 설치되어 있어야 함 (useApi 의존)
 *
 * @example
 * ```ts
 * // 일반 CRUD
 * export const useItemApi = defineApi((api) => ({
 *   items: api.get<Item[]>('/api/items'),
 *   addItem: api.post<ItemForm>('/api/items'),
 *   setItem: api.put<ItemForm>('/api/items'),
 *   deleteItem: api.delete<ItemForm>('/api/items'),
 * }));
 *
 * // 인증 불필요 엔드포인트
 * export const useAuthApi = defineApi((api) => ({
 *   login: api.post<LoginForm, TokenResponse>('/api/auth/login', { skipAuth: true }),
 *   notices: api.get<Notice[]>('/api/public/notices', { skipAuth: true }),
 * }));
 * ```
 *
 * @param setup - ApiBuilder를 받아 엔드포인트 정의 객체를 반환하는 콜백
 * @returns Vue composable 함수 — 컴포넌트 setup()에서 호출
 */
export function defineApi<T extends Record<string, AnyHandle>>(
  setup: (api: ApiBuilder) => T,
): () => T {
  return () => {
    const api = useApi();
    const queryClient = useQueryClient();

    const builder: ApiBuilder = {
      get: <TData>(url: string, options?: EndpointOptions) =>
        createQueryHandle<TData>(url, api, queryClient, options),

      post: <TParams = unknown, TData = void>(
        url: string,
        options?: EndpointOptions,
      ) => createMutationHandle<TData, TParams>('post', url, api, options),

      put: <TParams = unknown, TData = void>(
        url: string,
        options?: EndpointOptions,
      ) => createMutationHandle<TData, TParams>('put', url, api, options),

      delete: <TParams = unknown, TData = void>(
        url: string,
        options?: EndpointOptions,
      ) => createMutationHandle<TData, TParams>('delete', url, api, options),
    };

    return setup(builder);
  };
}
