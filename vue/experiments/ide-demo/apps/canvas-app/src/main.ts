import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './app/App.vue';
import { registerModule, setAppInstance } from '@/composables/useScriptRunner';
import './styles.css';
import './assets/canvas.css';

// ─── 사내 라이브러리 전체 import ───
import {
  // components
  AButton,
  AInputText,
  AInputNumber,
  ACard,
  AQueryCard,
  AFormField,
  ADataGrid,
  ACellButton,
  ACellEditable,
  AGridSelect,

  // plugins
  createWeb,
  WEB_KEY,
  AUTH_KEY,
  WS_KEY,

  // stores
  useAppStore,
  useGuardStore,

  // composables
  createAuth,
  createWebSocket,
  useAuth,
  useWebSocket,
  useDialog,
  useApi,
  useLoading,
  globalLoading,
  defineApi,
  useSelection,
  useGridEdit,

  // utils
  gridColumns,

  // types (columnTypes는 런타임 값)
  columnTypes,

  // i18n
  AG_GRID_LOCALE_KO,
} from '@ide-demo/shared';

import './assets/canvas.css';

const app = createApp(App);
app.use(createPinia());
app.use(
  createWeb({
    apiBaseUrl: '',
  }),
);

// createWeb이 필요하면 여기서 실행
// app.use(createWeb({ apiBaseUrl: '' }))

// ─── 컴포넌트 전역 등록 ───
app.component('AButton', AButton);
app.component('ACard', ACard);
app.component('AQueryCard', AQueryCard);
app.component('AFormField', AFormField);
app.component('AInputText', AInputText);
app.component('AInputNumber', AInputNumber);
app.component('ADataGrid', ADataGrid);
app.component('ACellButton', ACellButton);
app.component('ACellEditable', ACellEditable);
app.component('AGridSelect', AGridSelect);

// ─── 스크립트에서 import 가능한 모듈 등록 ───
// 'vue'는 useScriptRunner 내부에서 기본 등록됨

registerModule('@ide-demo/shared', {
  // components
  AButton,
  AInputText,
  AInputNumber,
  ACard,
  AQueryCard,
  AFormField,
  ADataGrid,
  ACellButton,
  ACellEditable,
  AGridSelect,

  // plugins
  createWeb,
  WEB_KEY,
  AUTH_KEY,
  WS_KEY,

  // stores
  useAppStore,
  useGuardStore,

  // composables
  createAuth,
  createWebSocket,
  useAuth,
  useWebSocket,
  useDialog,
  useApi,
  useLoading,
  globalLoading,
  defineApi,
  useSelection,
  useGridEdit,

  // utils
  gridColumns,

  // types (런타임 값)
  columnTypes,

  // i18n
  AG_GRID_LOCALE_KO,
});

// 외부 라이브러리 예시
// import axios from 'axios'
// registerModule('axios', { default: axios })

// import { useVuelidate } from '@vuelidate/core'
// registerModule('@vuelidate/core', { useVuelidate })

app.mount('#app');
setAppInstance(app);
