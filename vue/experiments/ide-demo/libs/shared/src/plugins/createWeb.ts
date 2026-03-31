import type { App, Plugin } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { VueQueryPlugin } from '@tanstack/vue-query';
import type { WebOptions } from '../types/api';
import type { AuthInstance } from '../types/auth';
import { createWebSocket } from '../composables/useWebSocket';
import { WEB_KEY, AUTH_KEY, WS_KEY } from './keys';

/**
 * auth, ws를 외부에서 생성하여 전달할 수 있습니다.
 * 전달하지 않으면 내부에서 자동 생성합니다.
 *
 * @example
 * ```typescript
 * // 방법 1 — 외부 생성 (라우터 가드 등에서 직접 접근 필요할 때)
 * const auth = createAuth({ onAuthFailure: () => router.push('/login') });
 * const ws = createWebSocket(auth, { url: '/ws' });
 *
 * app.use(createWeb({ auth, ws }));
 *
 * // 방법 2 — 내부 자동 생성 (컴포넌트에서만 사용할 때)
 * const auth = createAuth({ onAuthFailure: () => router.push('/login') });
 *
 * app.use(createWeb({ auth, wsOptions: { url: '/ws' } }));
 *
 * // 방법 3 — 콜백 방식 (하위 호환)
 * app.use(createWeb({
 *   getAccessToken: () => store.token,
 * }));
 * ```
 */
export function createWeb(options: WebOptions): Plugin {
  return {
    install(app: App) {
      // ── 1. PrimeVue 설정 ──
      app.use(PrimeVue, {
        theme: {
          preset: Aura,
          options: {
            cssLayer: {
              name: 'primevue',
              order: 'theme, base, primevue, utilities, components',
            },
          },
        },
      });
      app.use(ConfirmationService);
      app.use(ToastService);

      // ── 2. TanStack Vue Query ──
      app.use(VueQueryPlugin);

      // ── 3. auth 연동 ──
      const mergedOptions: WebOptions = {
        loginRoute: '/login',
        ...options,
      };

      if (options.auth) {
        const auth = options.auth as AuthInstance & {
          _setBaseUrl?: (url: string) => void;
        };

        // auth에 apiBaseUrl 전달
        auth._setBaseUrl?.(options.apiBaseUrl ?? '');

        // auth를 provide → useAuth()에서 inject
        app.provide(AUTH_KEY, options.auth);

        // useApi 하위 호환 콜백 자동 연결
        mergedOptions.getAccessToken = () => options.auth!.getAccessToken();
        mergedOptions.shouldRefreshToken = () =>
          options.auth!.shouldRefreshToken();
        mergedOptions.refreshToken = async () => {
          const success = await options.auth!.refreshAccessToken();
          return success ? options.auth!.getAccessToken() : null;
        };

        // ── 4. WebSocket ──
        // 외부 ws가 있으면 그대로, 없으면 내부 생성
        const ws =
          options.ws ?? createWebSocket(options.auth, options.wsOptions ?? {});
        app.provide(WS_KEY, ws);
      }

      // ── 5. 옵션 provide ──
      app.provide(WEB_KEY, mergedOptions);
    },
  };
}
