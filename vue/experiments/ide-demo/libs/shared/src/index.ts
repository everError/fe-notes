// styles
import './styles/index.css';

// AG Grid — 모듈 등록 (import 시 자동 실행)
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

// components
export { default as AButton } from './components/button/AButton.vue';
export { default as AInputText } from './components/inputs/AInputText.vue';
export { default as AInputNumber } from './components/inputs/AInputNumber.vue';
export { default as ACard } from './components/card/ACard.vue';
export { default as AQueryCard } from './components/card/AQueryCard.vue';
export { default as AFormField } from './components/form-field/AFormField.vue';
export { default as ADataGrid } from './components/grid/ADataGrid.vue';
export { default as ACellButton } from './components/grid/ACellButton.vue';
export { default as ACellEditable } from './components/grid/ACellEditable.vue';
export { default as AGridSelect } from './components/grid/AGridSelect.vue';

// plugins
export { createWeb } from './plugins/createWeb';
export { WEB_KEY, AUTH_KEY, WS_KEY } from './plugins/keys';

// stores
export { useAppStore } from './stores/useAppStore';
export type { ConfirmOptions } from './stores/useAppStore';
export { useGuardStore } from './stores/useGuardStore';

// composables — 팩토리 함수 (앱 초기화용)
export { createAuth } from './composables/useAuth';
export { createWebSocket } from './composables/useWebSocket';

// composables — inject 래퍼 (컴포넌트에서 사용)
export { useAuth } from './composables/useAuth';
export { useWebSocket } from './composables/useWebSocket';
export { useDialog } from './composables/useDialog';
export { useApi } from './composables/useApi';
export { useLoading, globalLoading } from './composables/useLoading';
export { defineApi } from './composables/defineApi';
export { useSelection } from './composables/useSelection';
export { useGridEdit } from './composables/useGridEdit';

// utils
export { gridColumns } from './utils/gridColumns';

// types
export type {
  WebOptions,
  ApiResponse,
  FileResponse,
  ResultSet,
} from './types/api';
export type {
  AuthOptions,
  AuthInstance,
  AuthUser,
  LoginRequest,
  LoginResponse,
} from './types/auth';
export type {
  WebSocketOptions,
  WebSocketInstance,
  WsData,
  WsMessage,
} from './types/ws';
export type { LabelProps, BaseInputProps } from './types/form';
export type { Selection, SelectionOptions } from './composables/useSelection';
export type {
  ADataGridProps,
  GridRowSelectedParams,
  GridEditOptions,
  CellChange,
  RowChange,
  ButtonColumnOptions,
} from './types/grid';
export { columnTypes } from './types/grid';

// i18n
export { AG_GRID_LOCALE_KO } from './i18n/ag-grid-locale-ko';
