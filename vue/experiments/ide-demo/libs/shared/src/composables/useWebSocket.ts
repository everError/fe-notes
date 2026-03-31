import { inject, ref } from 'vue';
import type {
  WebSocketOptions,
  WebSocketInstance,
  WsMessage,
  WsData,
} from '../types/ws';
import type { AuthInstance } from '../types/auth';
import { WS_KEY } from '../plugins/keys';

/**
 * UUID를 생성합니다.
 * WebSocket 요청/응답 매칭에 사용됩니다.
 * crypto.randomUUID() 우선, 미지원 환경은 Math.random() fallback
 */
function generateUUID(): string {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 서버 응답의 PascalCase 키를 camelCase로 변환합니다.
 *
 * 서버(C#)는 PascalCase로 직렬화하지만
 * 클라이언트(JS)는 camelCase를 사용하므로 JSON.parse의 reviver로 변환합니다.
 *
 * 예: { "AccountName": "test" } → { "accountName": "test" }
 */
function camelCaseReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const newObj: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) {
      const camelKey = k.charAt(0).toLowerCase() + k.slice(1);
      newObj[camelKey] = obj[k];
    }
    return newObj;
  }
  return value;
}

/**
 * WebSocket 연결 인스턴스를 생성합니다.
 *
 * 주요 기능:
 * - access token 기반 인증된 WebSocket 연결
 * - 30초 간격 heartbeat (ping/pong) + 실패 시 자동 재연결
 * - 요청/응답 매칭 (UUID 기반, 타임아웃 + 재시도)
 * - access token 갱신 (useAuth에 registerWsRefresher로 등록)
 *
 * 서버 메시지 프로토콜:
 * - 요청: { Id: uuid, Type: string, Json: string } (PascalCase)
 * - 응답: { Id: uuid, Type: string, Json: string } → camelCase 변환
 * - 에러: Type이 'Error'이면 실패로 처리
 *
 * @param auth - createAuth()로 생성한 인증 인스턴스
 * @param options - WebSocket 연결 옵션
 *
 * @example
 * ```typescript
 * const auth = createAuth({ ... });
 * const ws = createWebSocket(auth, { url: '/ws' });
 *
 * await ws.connect();
 * const result = await ws.sendMessageWithResponse('user', '{"action":"info"}');
 * ```
 */
export function createWebSocket(
  auth: AuthInstance,
  options: WebSocketOptions = {},
): WebSocketInstance {
  const {
    url = options.url ?? '/ws',
    heartbeatInterval = 30000, // 30초
    pingTimeout = 2000, // ping 응답 대기 2초
    messageTimeout = 5000, // 일반 메시지 응답 대기 5초
    maxRetries = 3, // 메시지 전송 최대 재시도 3회
    retryDelay = 500, // 재시도 간 대기 500ms
  } = options;

  // ========================================
  // 내부 상태
  // ========================================

  /** WebSocket 연결 여부 (반응형) */
  const isConnected = ref(false);

  /** 연결 진행 중 여부 (중복 connect 방지용) */
  const isConnecting = ref(false);

  /** WebSocket 인스턴스 (연결 해제 시 null) */
  let socket: WebSocket | null = null;

  /** heartbeat setInterval 핸들 */
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 요청 ID → resolve 콜백 매핑
   *
   * sendMessage/sendMessageWithResponse에서 UUID를 키로 등록하고,
   * onmessage에서 동일한 UUID의 응답이 오면 콜백을 호출합니다.
   * 타임아웃 시 해당 ID를 삭제합니다.
   */
  const pendingResponses: Record<string, (data: unknown) => void> = {};

  // ========================================
  // Heartbeat (연결 상태 모니터링)
  // ========================================

  /**
   * heartbeat 타이머를 시작합니다.
   * heartbeatInterval(기본 30초) 간격으로 ping을 보내고,
   * 응답이 없으면 재연결을 시도합니다.
   */
  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatTimer = setInterval(async () => {
      try {
        await sendPing();
      } catch {
        // ping 실패 → 연결 끊김으로 판단, 재연결 시도
        reconnect();
      }
    }, heartbeatInterval);
  };

  /** heartbeat 타이머를 중지합니다. */
  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  // ========================================
  // 메시지 수신
  // ========================================

  /**
   * WebSocket onmessage 핸들러
   *
   * 서버 응답을 파싱하고, 요청 ID가 매칭되는 pending 콜백을 호출합니다.
   * - PascalCase → camelCase 자동 변환
   * - Type이 'Error'이면 success: false
   * - Json 필드를 한 번 더 파싱하여 실제 데이터 추출
   */
  const handleMessage = (event: MessageEvent) => {
    try {
      const response = JSON.parse(event.data, camelCaseReviver) as WsMessage;

      // 매칭되는 pending 요청이 있으면 콜백 호출
      if (response.id && pendingResponses[response.id]) {
        try {
          const isError =
            response.type === 'error' || response.type === 'Error';
          pendingResponses[response.id]({
            success: !isError,
            data:
              !isError && response.json
                ? JSON.parse(response.json, camelCaseReviver)
                : null,
          });
        } finally {
          // 콜백 호출 후 반드시 제거 (메모리 누수 방지)
          delete pendingResponses[response.id];
        }
      }
    } catch {
      // JSON 파싱 실패 — 무시 (비정상 메시지)
    }
  };

  // ========================================
  // 연결 관리
  // ========================================

  /**
   * WebSocket 연결을 수립합니다.
   *
   * 흐름:
   * 1. 이미 연결됨 → true 즉시 반환
   * 2. 연결 진행 중 → 완료까지 대기 후 결과 반환 (중복 연결 방지)
   * 3. auth에서 access token 획득
   * 4. ws://{host}/ws?token={accessToken}으로 연결
   * 5. 연결 성공 → heartbeat 시작 + auth에 WS 갱신 함수 등록
   *
   * @returns 연결 성공 여부
   */
  const connect = async (): Promise<boolean> => {
    // 이미 연결된 상태
    if (socket?.readyState === WebSocket.OPEN) {
      return true;
    }

    // 다른 곳에서 이미 연결을 시도 중 → 완료까지 대기
    if (isConnecting.value) {
      return new Promise<boolean>((resolve) => {
        const check = setInterval(() => {
          if (!isConnecting.value) {
            clearInterval(check);
            resolve(isConnected.value);
          }
        }, 50);
      });
    }

    isConnecting.value = true;

    try {
      // access token 필요 — 없으면 연결 불가
      const token = auth.getAccessToken();
      if (!token) {
        isConnecting.value = false;
        return false;
      }

      // WebSocket URL 구성 (http→ws, https→wss 자동 변환)
      const wsUrl = buildWsUrl(url, token);
      socket = new WebSocket(wsUrl);

      return await new Promise<boolean>((resolve) => {
        socket!.onopen = () => {
          isConnected.value = true;
          isConnecting.value = false;

          // 연결 성공 → heartbeat 시작
          startHeartbeat();

          // auth에 WebSocket 토큰 갱신 함수 등록
          // 이후 auth의 scheduleRefresh 타이머에서 WS 갱신을 우선 사용
          auth.registerWsRefresher(refreshToken);

          resolve(true);
        };

        socket!.onclose = () => {
          cleanup();
          resolve(false);
        };

        socket!.onerror = () => {
          cleanup();
          resolve(false);
        };

        // 모든 수신 메시지는 handleMessage에서 처리
        socket!.onmessage = handleMessage;
      });
    } catch {
      cleanup();
      return false;
    }
  };

  /**
   * 현재 프로토콜과 호스트를 기반으로 WebSocket URL을 생성합니다.
   *
   * - 절대 경로 (ws://, wss://) → 그대로 사용
   * - 상대 경로 (/ws) → 현재 페이지 호스트 기반으로 변환
   *   - http: → ws:, https: → wss:
   *
   * @param path - WebSocket 경로
   * @param token - 쿼리 파라미터로 전달할 access token
   */
  const buildWsUrl = (path: string, token: string): string => {
    if (path.startsWith('ws://') || path.startsWith('wss://')) {
      return `${path}?token=${token}`;
    }
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}${path}?token=${token}`;
  };

  /**
   * 내부 상태를 초기화합니다.
   * 연결 해제, heartbeat 중지, pending 요청 전부 실패 처리
   */
  const cleanup = () => {
    stopHeartbeat();
    isConnected.value = false;
    isConnecting.value = false;
    socket = null;

    // 대기 중인 요청을 전부 실패로 resolve (메모리 누수 방지)
    for (const id of Object.keys(pendingResponses)) {
      try {
        pendingResponses[id]({ success: false, data: null });
      } catch {
        /* ignore */
      }
      delete pendingResponses[id];
    }
  };

  /**
   * WebSocket 연결을 명시적으로 해제합니다.
   * 로그아웃이나 페이지 이탈 시 호출합니다.
   */
  const disconnect = () => {
    stopHeartbeat();

    if (socket) {
      // onclose에서 cleanup이 또 호출되지 않도록 핸들러 제거
      socket.onclose = null;
      socket.close();
    }

    cleanup();
  };

  /**
   * WebSocket을 재연결합니다.
   * 기존 연결을 끊고 새로 연결합니다.
   * heartbeat ping 실패 시 자동으로 호출됩니다.
   */
  const reconnect = async (): Promise<boolean> => {
    disconnect();
    return connect();
  };

  // ========================================
  // 메시지 전송
  // ========================================

  /**
   * fire-and-forget 방식으로 메시지를 보냅니다.
   * 응답이 오면 action 콜백이 호출됩니다.
   *
   * @param type - 메시지 타입 (서버에서 라우팅에 사용)
   * @param json - JSON 문자열 (서버에서 파싱할 데이터)
   * @param action - 응답 수신 시 호출되는 콜백
   *
   * @example
   * ```typescript
   * ws.sendMessage('user', '{"action":"info"}', (result) => {
   *   if (result.success) console.log(result.data);
   * });
   * ```
   */
  const sendMessage = <T = unknown>(
    type: string,
    json: string,
    action: (data: WsData<T>) => void,
  ) => {
    // 연결되지 않은 상태면 즉시 실패
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      action({ success: false, data: null });
      return;
    }

    const id = generateUUID();
    pendingResponses[id] = action as (data: unknown) => void;

    // 서버 프로토콜: PascalCase { Id, Type, Json }
    socket.send(JSON.stringify({ Id: id, Type: type, Json: json }));
  };

  /**
   * 응답을 기다리는 메시지를 보냅니다. (Promise 기반)
   *
   * - messageTimeout(기본 5초) 내 응답 없으면 재시도
   * - maxRetries(기본 3회) 초과 시 reject
   * - 재시도 간 retryDelay(기본 500ms) 대기
   *
   * @param type - 메시지 타입
   * @param json - JSON 문자열
   * @param currentAttempt - 현재 시도 횟수 (내부 재귀용)
   * @returns 응답 데이터
   *
   * @example
   * ```typescript
   * const result = await ws.sendMessageWithResponse<User[]>('user', '{"action":"list"}');
   * if (result.success) console.log(result.data);
   * ```
   */
  const sendMessageWithResponse = <T = unknown>(
    type: string,
    json: string,
    currentAttempt = 0,
  ): Promise<WsData<T>> => {
    return new Promise((resolve, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket is not connected'));
      }

      const id = generateUUID();

      // 서버로 메시지 전송
      socket.send(JSON.stringify({ Id: id, Type: type, Json: json }));

      // 타임아웃 설정 — 응답이 시간 내에 안 오면 재시도
      const timer = setTimeout(() => {
        if (!pendingResponses[id]) return; // 이미 응답 받음
        delete pendingResponses[id];

        if (currentAttempt < maxRetries) {
          // 재시도 (retryDelay 후)
          setTimeout(() => {
            sendMessageWithResponse<T>(type, json, currentAttempt + 1)
              .then(resolve)
              .catch(reject);
          }, retryDelay);
        } else {
          // 최대 재시도 초과
          reject(new Error('WebSocket response timeout after retries'));
        }
      }, messageTimeout);

      // 응답 수신 콜백 등록
      pendingResponses[id] = (data: unknown) => {
        clearTimeout(timer);
        resolve(data as WsData<T>);
      };
    });
  };

  // ========================================
  // Ping/Pong
  // ========================================

  /**
   * 서버에 ping을 보내고 pong 응답을 기다립니다.
   *
   * heartbeat에서 주기적으로 호출되며,
   * pingTimeout(기본 2초) 내에 응답이 없으면 reject됩니다.
   * (→ reconnect 트리거)
   */
  const sendPing = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return reject(new Error('Not connected'));
      }

      const id = generateUUID();

      // ping 타임아웃
      const timer = setTimeout(() => {
        delete pendingResponses[id];
        reject(new Error('Ping timeout'));
      }, pingTimeout);

      // pong 수신 콜백
      pendingResponses[id] = () => {
        clearTimeout(timer);
        resolve();
      };

      // 서버에 Ping 타입 메시지 전송
      socket.send(JSON.stringify({ Id: id, Type: 'Ping', Json: '' }));
    });
  };

  // ========================================
  // 토큰 갱신 (auth에 등록되는 함수)
  // ========================================

  /**
   * WebSocket으로 access token을 갱신합니다.
   *
   * connect() 성공 시 auth.registerWsRefresher(refreshToken)으로 등록되어,
   * 이후 auth의 scheduleRefresh 타이머에서 호출됩니다.
   *
   * 서버 메시지 포맷:
   * - 요청: Type='user', Json='{"action":"token"}'
   * - 응답: { token: string }
   *
   * @returns 새 access token 또는 null (실패 시)
   */
  const refreshToken = async (): Promise<string | null> => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return null;
    }

    try {
      const result = await sendMessageWithResponse<{ token: string }>(
        'user',
        JSON.stringify({ action: 'token' }),
      );
      return result.success ? (result.data?.token ?? null) : null;
    } catch {
      return null;
    }
  };

  // ========================================
  // 반환
  // ========================================

  return {
    // 반응형 상태
    isConnected,
    isConnecting,

    // 연결 관리
    connect,
    disconnect,
    reconnect,

    // 메시지 전송
    sendMessage,
    sendMessageWithResponse,

    // 토큰 갱신 (auth 연동용)
    refreshToken,
  };
}

/**
 * WebSocket composable을 사용합니다.
 *
 * createWeb({ auth, wsOptions })로 등록된 WebSocketInstance를 inject합니다.
 * auth가 없으면 WebSocket도 생성되지 않습니다.
 *
 * @throws WebSocket이 등록되지 않은 경우 에러
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 *
 * const ws = useWebSocket();
 *
 * // 페이지 진입 시 연결
 * const connected = await ws.connect();
 *
 * // 메시지 전송
 * const result = await ws.sendMessageWithResponse('user', '{"action":"info"}');
 * </script>
 * ```
 */
export function useWebSocket(): WebSocketInstance {
  const ws = inject(WS_KEY);
  if (!ws) {
    throw new Error(
      '[useWebSocket] createWeb({ auth })로 auth를 등록해야 WebSocket이 사용 가능합니다.',
    );
  }
  return ws;
}
