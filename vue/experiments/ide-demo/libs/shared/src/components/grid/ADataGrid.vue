<template>
  <div class="h-full flex flex-col">
    <ag-grid-vue
      ref="gridRef"
      class="flex-1"
      :theme="gridTheme"
      :row-data="rowData"
      :column-defs="processedColDefs"
      :column-types="columnTypes"
      :row-selection="rowSelectionConfig"
      :row-class-rules="rowClassRules"
      :cell-class-rules="cellClassRules"
      :selection-column-def="selectionColumnDef"
      :grid-options="mergedGridOptions"
      :no-rows-overlay-component="ANoRowsOverlay"
      @row-selected="onRowSelected"
      @row-clicked="onRowClicked"
      @row-double-clicked="onRowDoubleClicked"
      @selection-changed="onSelectionChanged"
      @cell-key-down="onCellKeyDown"
      @cell-value-changed="onCellValueChanged"
      @grid-ready="onGridReady"
      @filter-changed="updateRowCount"
      @model-updated="updateRowCount"
    />
    <div
      v-if="rowCountDisplay"
      style="
        height: 16px;
        padding-right: 12px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        font-size: 11px;
        line-height: 1;
        user-select: none;
      "
      class="text-gray-400 font-semibold"
    >
      <span class="mr-1">Rows</span>
      <span>{{ displayedRowCount.toLocaleString() }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  computed,
  ref,
  nextTick,
  onMounted,
  onBeforeUnmount,
  defineComponent,
  type ComponentPublicInstance,
} from 'vue';
import type {
  GridApi,
  GridOptions,
  GridReadyEvent,
  RowSelectedEvent,
  RowDoubleClickedEvent,
  SelectionChangedEvent,
  CellKeyDownEvent,
  CellValueChangedEvent,
  FullWidthCellKeyDownEvent,
  IRowNode,
  RowSelectionOptions,
  GetRowIdParams,
  ValueFormatterFunc,
  CellStyle,
} from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import { useClipboard } from '@vueuse/core';
import { AG_GRID_LOCALE_KO } from '../../i18n/ag-grid-locale-ko';
import { columnTypes, ADataGridExpose } from '../../types/grid';
import type { ADataGridProps, GridRowSelectedParams } from '../../types/grid';
import ANoRowsOverlay from './ANoRowsOverlay.vue';

import { themeQuartz } from 'ag-grid-community';

const gridTheme = themeQuartz.withParams({
  headerBackgroundColor: '#faf8f5',
  spacing: 8,
  fontSize: 12,
});

// AG Grid 모듈 등록 => 사용하는 프로젝트 main.ts 에서 진행
// ModuleRegistry.registerModules([AllCommunityModule]);
// ModuleRegistry.registerModules([ColumnAutoSizeModule, ColumnApiModule]);

const { copy } = useClipboard({ legacy: true });

// ── Props & Emits ──

const props = withDefaults(defineProps<ADataGridProps>(), {
  rowData: () => [],
  colDefs: () => [],
  multiRow: false,
  rowIds: null,
  enableClickSelection: null,
  selectionCheckBox: null,
  rowCountDisplay: true,
  gridOptions: () => ({}),
});

const emit = defineEmits<{
  rowClicked: [params: GridRowSelectedParams];
  rowSelected: [params: GridRowSelectedParams];
  selectionChanged: [nodes: IRowNode[]];
  cellValueChanged: [params: CellValueChangedEvent];
  rowDoubleClicked: [params: RowDoubleClickedEvent];
}>();

// ── 내부 상태 ──

const gridRef = ref<ComponentPublicInstance<typeof AgGridVue> | null>(null);
const gridApi = ref<GridApi | null>(null);
const displayedRowCount = ref(0);

// ── 행 수 카운트 ──

const updateRowCount = () => {
  if (!gridApi.value) return;
  displayedRowCount.value = gridApi.value.getDisplayedRowCount();
};

// ── 컬럼 정의 가공 ──

/** headerName이 있는 컬럼만 필터 활성화 */
const processedColDefs = computed(() =>
  props.colDefs.map((col: any) => ({
    ...col,
    filter: col.headerName && col.headerName.trim() !== '' ? true : false,
  })),
);

// ── 행 선택 설정 ──

const rowSelectionConfig = computed(
  () =>
    ({
      mode: props.multiRow ? 'multiRow' : 'singleRow',
      enableClickSelection: props.enableClickSelection ?? true,
      checkboxes: props.multiRow ? true : (props.selectionCheckBox ?? false),
    }) as RowSelectionOptions,
);

const selectionColumnDef = { resizable: true, sortable: true, width: 70 };

// ── GridOptions 병합 ──

const mergedGridOptions = computed<GridOptions>(() => {
  const base: GridOptions = {
    localeText: AG_GRID_LOCALE_KO,
    // mergedGridOptions 안의 cellStyle 수정
    defaultColDef: {
      filter: true,
      cellStyle: (params): CellStyle | undefined => {
        if (typeof params.value === 'number') {
          return { textAlign: 'right' };
        }
        if (typeof params.value === 'boolean' || params.value === null) {
          return { display: 'flex', justifyContent: 'center' };
        }
        return undefined;
      },
    },
    singleClickEdit: true,
    stopEditingWhenCellsLoseFocus: true,
    ...(props.gridOptions ?? {}),
  };

  // rowIds가 있으면 getRowId 자동 설정
  if (props.rowIds && props.rowIds.length > 0) {
    base.getRowId = (params: GetRowIdParams) => {
      const idValues = props.rowIds!.map((key) => params.data?.[key]);
      const hasMissing = idValues.some((v) => v === undefined || v === null);

      if (hasMissing) {
        throw new Error(
          `[ADataGrid] getRowId: 키(${props.rowIds!.join(', ')})가 데이터에서 누락되었습니다.`,
        );
      }

      return idValues.join('-');
    };

    base.onRowDataUpdated = () => {
      autoSizeColumns();
    };
  }

  return base;
});

// ── Grid Ready ──

const onGridReady = (params: GridReadyEvent) => {
  gridApi.value = params.api;
  updateRowCount();
};

// ── 컬럼 자동 너비 ──

const autoSizeColumns = (editableColumnOffset: number = 50) => {
  if (!gridApi.value) return;

  gridApi.value.autoSizeAllColumns();

  // 편집 가능 컬럼은 약간 더 넓힘
  const editColumns = processedColDefs.value
    .filter((col: any) => !!col.cellEditor)
    .map((x: any) => x.field)
    .filter(Boolean);

  if (editColumns.length > 0) {
    const editColumnState = gridApi.value
      .getColumnState()
      .filter((col) => editColumns.includes(col.colId))
      .map((col) => ({
        ...col,
        width: (col.width ?? 100) + editableColumnOffset,
      }));

    gridApi.value.applyColumnState({
      state: editColumnState,
      applyOrder: false,
    });
  }
};

// ── 이벤트 핸들러 ──

const onRowClicked = (event: RowSelectedEvent) => {
  emit('rowClicked', {
    data: event.data as Record<string, unknown>,
    isSelected: event.node.isSelected(),
    node: event.node,
  });

  // enableClickSelection이 명시적 false일 때 수동 토글
  if (props.enableClickSelection === false) {
    event.event?.preventDefault();
    const selected = event.node.isSelected();
    event.node.setSelected(!selected, false);
  }
};

const onRowSelected = (event: RowSelectedEvent) => {
  // 이전 선택 해제 이벤트는 event.event가 없음 — 무시
  if (!event.event) return;

  emit('rowSelected', {
    data: event.data as Record<string, unknown>,
    isSelected: event.node.isSelected(),
    node: event.node,
  });
};

const onRowDoubleClicked = (event: RowDoubleClickedEvent) => {
  emit('rowDoubleClicked', event);
};

const onSelectionChanged = (event: SelectionChangedEvent) => {
  emit('selectionChanged', event.api.getSelectedNodes());
};

const onCellValueChanged = (event: CellValueChangedEvent) => {
  emit('cellValueChanged', event);
};

// ── Ctrl+C 셀 복사 ──

const onCellKeyDown = (event: CellKeyDownEvent | FullWidthCellKeyDownEvent) => {
  if (!(event.event instanceof KeyboardEvent)) return;
  if (event.event.code !== 'KeyC' || !event.event.ctrlKey) return;
  if (!('colDef' in event)) return;

  const valueFormatter = event.colDef.valueFormatter as
    | ValueFormatterFunc
    | undefined;
  const formattedValue = valueFormatter
    ? valueFormatter({
        value: event.value,
        node: event.node!,
        data: event.data,
        column: event.column,
        colDef: event.colDef,
        api: event.api,
        context: event.context,
      })
    : event.value;

  copy(formattedValue)
    .then(() => flashCell(event as CellKeyDownEvent, true))
    .catch(() => flashCell(event as CellKeyDownEvent, false));
};

/** 복사 시 셀 배경 플래시 효과 */
const flashCell = (event: CellKeyDownEvent, isSuccess: boolean) => {
  const rowIndex = event.node?.rowIndex;
  const colId = event.column?.getColId();
  if (rowIndex == null || !colId) return;

  const rowEl = document.querySelector(`.ag-row[row-index="${rowIndex}"]`);
  const cellEl = rowEl?.querySelector(`[col-id="${colId}"]`);
  if (!(cellEl instanceof HTMLElement)) return;

  const cls = isSuccess ? 'bg-green-200' : 'bg-red-200';
  cellEl.classList.add('transition-colors', 'duration-200', cls);

  setTimeout(() => {
    cellEl.classList.remove('bg-green-200', 'bg-red-200');
  }, 200);
};

// ── ResizeObserver (탭 활성화 시 자동 컬럼 사이즈) ──

let resizeObserver: ResizeObserver | null = null;
let autoSizeDone = false;

onMounted(() => {
  gridApi.value = (gridRef.value as unknown as { api: GridApi })?.api;

  if (!gridRef.value) return;

  resizeObserver = new ResizeObserver(async (entries) => {
    if (autoSizeDone || !gridApi.value) return;

    const width = entries[0].contentRect.width;
    if (width > 0) {
      autoSizeDone = true;
      await nextTick();
      gridApi.value!.autoSizeAllColumns();
      resizeObserver?.disconnect();
      resizeObserver = null;
    }
  });

  resizeObserver.observe(gridRef.value.$el);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

// ── Expose API ──

defineExpose<ADataGridExpose>({
  /** AG Grid API 직접 접근 */
  getGridApi: () => gridApi.value,
  /** 선택된 행 데이터 배열 */
  getSelectedRows: () => gridApi.value?.getSelectedRows() ?? [],
  /** 선택된 첫 번째 행 데이터 */
  getFirstSelectedRow: () => gridApi.value?.getSelectedRows()?.[0],
  /** rowIds 기반으로 특정 행 선택 */
  selectRow: (idValues: unknown[], emitEvent = true) => {
    const node = gridApi.value?.getRowNode(idValues.join('-'));
    if (node) {
      gridApi.value?.setNodesSelected({ nodes: [node], newValue: true });
      if (emitEvent) {
        emit('rowSelected', {
          data: node.data,
          isSelected: node.isSelected(),
          node,
        });
      }
    }
  },
  /** 전체 행 선택 */
  selectAll: () => gridApi.value?.selectAll(),
  /** 전체 선택 해제 */
  deselectAll: () => gridApi.value?.deselectAll(),
  /** CSV 내보내기 */
  exportCsv: (fileName?: string, skipHeaders = false) => {
    gridApi.value?.exportDataAsCsv({
      fileName: fileName ?? 'export',
      skipColumnHeaders: skipHeaders,
    });
  },
  /** 컬럼 자동 너비 조정 */
  autoSizeColumns,
  /** 셀 새로고침 */
  refreshCells: () => gridApi.value?.refreshCells({ force: true }),
  /** 행 다시 그리기 */
  redrawRows: () => gridApi.value?.redrawRows(),
});
</script>

<style>
.modified-cell {
  background-color: rgb(254 243 199) !important; /* amber-100 */
  border-left: 4px solid rgb(245 158 11) !important; /* amber-500 */
}
.ag-row-odd {
  background-color: #f9fafb;
}
.header-center .ag-header-cell-label {
  justify-content: center;
}
</style>
