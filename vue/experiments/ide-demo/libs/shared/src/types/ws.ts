import type { Ref } from "vue";

/** WebSocket 요청 (서버로 전송 — PascalCase) */
export interface WsRequest {
  Id: string;
  Type: string;
  Json: string;
}

/** WebSocket 응답 (서버에서 수신 — camelCase 변환 후) */
export interface WsMessage {
  id: string;
  type: string;
  json: string;
}

/** sendMessage 콜백/Promise 결과 */
export interface WsData<T = unknown> {
  success: boolean;
  data: T | null;
}

/** useWebSocket 옵션 (앱에서 설정) */
export interface WebSocketOptions {
  /** WebSocket 경로 (기본: '/ws') */
  url?: string;
  /** heartbeat 간격 ms (기본: 30000) */
  heartbeatInterval?: number;
  /** ping 타임아웃 ms (기본: 2000) */
  pingTimeout?: number;
  /** 메시지 응답 타임아웃 ms (기본: 5000) */
  messageTimeout?: number;
  /** 최대 재시도 횟수 (기본: 3) */
  maxRetries?: number;
  /** 재연결 대기 ms (기본: 500) */
  retryDelay?: number;
}

/** useWebSocket 반환 타입 */
export interface WebSocketInstance {
  /** 연결 상태 */
  isConnected: Ref<boolean>;
  /** 연결 진행 중 */
  isConnecting: Ref<boolean>;

  /** WebSocket 연결 */
  connect: () => Promise<boolean>;
  /** 연결 해제 */
  disconnect: () => void;
  /** 재연결 */
  reconnect: () => Promise<boolean>;

  /** fire-and-forget 메시지 전송 */
  sendMessage: <T = unknown>(
    type: string,
    json: string,
    action: (data: WsData<T>) => void,
  ) => void;
  /** 응답 대기 메시지 전송 */
  sendMessageWithResponse: <T = unknown>(
    type: string,
    json: string,
  ) => Promise<WsData<T>>;

  /** WebSocket으로 토큰 갱신 (useAuth에 등록될 함수) */
  refreshToken: () => Promise<string | null>;
}
