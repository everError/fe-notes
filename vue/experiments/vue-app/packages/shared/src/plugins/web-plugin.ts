import { type App } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Aura from '@primevue/themes/aura';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import router from '@shared/router';
import { createPinia } from 'pinia';
import ConfirmationService from 'primevue/confirmationservice';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';

function setPrimeVueComponents(app: App<any>) {
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        cssLayer: {
          name: 'primevue',
          order: 'base, primevue',
        },
      },
    },
  });
  app.use(ToastService);
}
function setAgGrid() {
  // Register all Community features
  ModuleRegistry.registerModules([AllCommunityModule]);
}

function setTanstackQueryClient(app: App<any>) {
  app.use(VueQueryPlugin, {
    queryClient: new QueryClient({
      defaultOptions: {
        // 쿼리 auto refetch 관련 default 설정값
        queries: {
          // 윈도우 포커스
          refetchOnWindowFocus: false,
          // 컴포넌트 마운트 시
          refetchOnMount: false,
          // 네트워크 재연결 시
          refetchOnReconnect: false,
          // 일정 간격
          refetchInterval: false,
          // refetchInterval 설정 시 백그라운드 동작 여부
          refetchIntervalInBackground: false,
        },
      },
    }),
  });
}

function initApp(app: App<any>) {
  const pinia = createPinia();
  setPrimeVueComponents(app);
  setAgGrid();
  setTanstackQueryClient(app);
  app.use(ConfirmationService);
  app.use(router);
  app.use(pinia);
}

export { initApp };
