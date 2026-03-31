import type { InjectionKey } from 'vue';
import type { WebOptions } from '../types/api';
import type { AuthInstance } from '../types/auth';
import type { WebSocketInstance } from '../types/ws';

/** 플러그인 옵션 주입 키 (useApi에서 사용) */
export const WEB_KEY: InjectionKey<WebOptions> = Symbol('-web');

/** 인증 인스턴스 주입 키 (useAuth에서 사용) */
export const AUTH_KEY: InjectionKey<AuthInstance> = Symbol('-auth');

/** WebSocket 인스턴스 주입 키 (useWebSocket에서 사용) */
export const WS_KEY: InjectionKey<WebSocketInstance> = Symbol('-ws');
