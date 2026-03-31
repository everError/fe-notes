import type {
  ColDef,
  ColGroupDef,
  CellClassParams,
  RowClassParams,
  IRowNode,
  ValueFormatterFunc,
} from 'ag-grid-community';

// ========================================
// Props 타입
// ========================================

/** ADataGrid 컴포넌트 Props */
export interface ADataGridProps {
  /** 그리드에 표시할 행 데이터 */
  rowData?: Record<string, unknown>[];
  /** 컬럼 정의 배열 */
  colDefs?: (ColDef | ColGroupDef)[];
  /** 다중 행 선택 모드. false면 단일 선택 (기본: false) */
  multiRow?: boolean;
  /**
   * 행 고유 키 필드명 배열.
   * 지정하면 getRowId가 자동 설정되어 행 업데이트 시 깜빡임 방지.
   * 예: ['itemKey'] 또는 ['orderKey', 'orderDetailKey'] (복합키)
   */
  rowIds?: string[] | null;
  /** 클릭으로 행 선택 활성화 (기본: true) */
  enableClickSelection?: boolean | null;
  /** 선택 체크박스 표시 (multiRow=true면 자동 true) */
  selectionCheckBox?: boolean | null;
  /** 행 CSS 클래스 규칙 */
  rowClassRules?: Record<string, (params: RowClassParams) => boolean>;
  /** 셀 CSS 클래스 규칙 */
  cellClassRules?: Record<string, (params: CellClassParams) => boolean>;
  /** 하단 행 수 카운트 표시 (기본: true) */
  rowCountDisplay?: boolean;
  /** AG Grid 추가 옵션 (네이티브 GridOptions 병합) */
  gridOptions?: Record<string, unknown>;
}

// ========================================
// Emit 이벤트 타입
// ========================================

/** 행 선택/클릭 이벤트 파라미터 */
export interface GridRowSelectedParams {
  /** 행 데이터 */
  data: Record<string, unknown>;
  /** 체크박스 선택 여부 */
  isSelected: boolean | undefined;
  /** AG Grid IRowNode */
  node: IRowNode | undefined;
}

// ========================================
// Column Types
// ========================================

/**
 * 공통 컬럼 타입 정의.
 * ColDef의 type 속성에 지정하면 해당 valueFormatter가 자동 적용됩니다.
 *
 * @example
 * ```typescript
 * const colDefs = [
 *   { field: 'qty', headerName: '수량', type: 'number' },
 *   { field: 'date', headerName: '날짜', type: 'date' },
 *   { field: 'status', headerName: '상태', type: 'code', context: { codes: statusCodes } },
 * ];
 * ```
 */
export const columnTypes: Record<string, ColDef> = {
  /** 숫자 포맷 — 천 단위 콤마, 소수점 3자리까지 */
  number: {
    valueFormatter: ((params) => {
      if (params.value == null) return '';
      return Number(params.value).toLocaleString('ko-KR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      });
    }) as ValueFormatterFunc,
  },
  /** 날짜 포맷 — YYYY-MM-DD */
  date: {
    valueFormatter: ((params) => {
      if (!params.value) return '';
      const date = new Date(params.value);
      return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    }) as ValueFormatterFunc,
  },
  /** 코드 → 표시값 변환. colDef.context.codes에 { code, value } 배열 필요 */
  code: {
    valueFormatter: ((params) => {
      const lookupData = params.colDef.context?.codes;
      const item = lookupData?.find(
        (entry: { code: string; value: string }) => entry.code === params.value,
      );
      return item ? item.value : (params.value ?? '');
    }) as ValueFormatterFunc,
  },
};

// ========================================
// useGridEdit 타입
// ========================================

/** useGridEdit 초기화 옵션 */
export interface GridEditOptions {
  /**
   * 행 고유 키 필드명.
   * 수정 추적 시 행을 식별하는 데 사용합니다.
   * 예: 'itemKey', 'orderDetailKey'
   */
  rowKeyField: string;
}

/** 셀 변경 정보 */
export interface CellChange {
  /** 원본 값 */
  original: unknown;
  /** 현재 값 */
  current: unknown;
}

/** 행 단위 변경 정보 */
export interface RowChange {
  /** 행 키 */
  rowKey: string;
  /** 필드별 변경 정보 */
  changes: Record<string, CellChange>;
}

// ========================================
// gridColumns 타입
// ========================================

/** gridColumns.button() 옵션 */
export interface ButtonColumnOptions {
  /** 버튼 텍스트 */
  label: string;
  /** 클릭 핸들러 — 행 데이터를 받음 */
  onClick: (rowData: any) => void;
  /** 조건부 숨김 — true 반환 시 버튼 숨김 */
  hide?: (rowData: any) => boolean;
  /** 컬럼 너비 (기본: 80) */
  width?: number;
}

// ========================================
// ADataGrid Expose 타입
// ========================================

/** ADataGrid의 defineExpose 타입 */
export interface ADataGridExpose {
  getGridApi: () => unknown;
  getSelectedRows: () => unknown[];
  getFirstSelectedRow: () => unknown | undefined;
  selectRow: (idValues: unknown[], emitEvent?: boolean) => void;
  selectAll: () => void;
  deselectAll: () => void;
  exportCsv: (fileName?: string, skipHeaders?: boolean) => void;
  autoSizeColumns: (editableColumnOffset?: number) => void;
  refreshCells: () => void;
  redrawRows: () => void;
}
