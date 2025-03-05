import { type App } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Aura from '@primeuix/themes/aura';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import router from '@shared/router';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';

function setPrimeVueComponents(app: App<any>) {
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        // prefix: 'p',
        cssLayer: {
          name: 'primevue',
          order: 'theme, base, primevue, utilities, components',
        },
      },
    },
  });
  app.use(ToastService);
}

function setAgGrid() {
  ModuleRegistry.registerModules([AllCommunityModule]);
}

function setTanstackQueryClient(app: App<any>) {
  app.use(VueQueryPlugin, {
    queryClient: new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false,
          refetchInterval: false,
          refetchIntervalInBackground: false,
        },
      },
    }),
  });
}

function initApp(app: App<any>) {
  setPrimeVueComponents(app);
  setAgGrid();
  setTanstackQueryClient(app);
  app.use(router);
}

export { initApp };
