import { shallowRef, computed, onScopeDispose, getCurrentScope } from "vue";
import { useGuardStore } from "../stores/useGuardStore";
import type { GridEditOptions, RowChange } from "../types/grid";
import ACellEditable from "../components/grid/ACellEditable.vue";

/**
 * 그리드 셀 편집 수정 추적 composable.
 *
 * 셀 값이 변경될 때 원본값을 저장하고,
 * 현재값이 원본으로 돌아가면 자동으로 수정 상태를 해제합니다.
 *
 * `editable()`로 ColDef에 스프레드하면 수정 추적, 셀 스타일, 되돌리기가 자동 적용됩니다.
 * `useGuardStore`에 자동 등록되어 라우터 이동 시 dirty check에 포함됩니다.
 *
 * @param options - rowKeyField 필수
 *
 * @example
 * ```typescript
 * const gridEdit = useGridEdit({ rowKeyField: 'itemKey' });
 *
 * const colDefs = [
 *   { field: 'itemNo', headerName: '품번' },
 *   { field: 'itemName', headerName: '품명', ...gridEdit.editable() },
 *   { field: 'qty', headerName: '수량', type: 'number', ...gridEdit.editable() },
 * ];
 * ```
 */
export function useGridEdit(options: GridEditOptions) {
  const { rowKeyField } = options;

  /**
   * 원본값 저장소.
   * key: "rowKey:field", value: 원본값
   * shallowRef + new Map()으로 반응성 트리거
   */
  const originalValues = shallowRef<Map<string, unknown>>(new Map());

  /**
   * 셀 값 변경을 추적합니다.
   *
   * - 최초 변경: 원본값을 저장
   * - 원본으로 되돌아오면: 추적 해제 (자동 복원 감지)
   *
   * @param rowKey - 행 고유 키 (문자열)
   * @param field - 컬럼 필드명
   * @param originalValue - 변경 전 값
   * @param newValue - 변경 후 값
   */
  const trackChange = (
    rowKey: string,
    field: string,
    originalValue: unknown,
    newValue: unknown,
  ) => {
    const key = `${rowKey}:${field}`;
    const next = new Map(originalValues.value);

    // 최초 변경 — 원본값 저장
    if (!next.has(key)) {
      next.set(key, originalValue);
    }

    // 원본으로 되돌아가면 추적 해제
    if (next.get(key) === newValue) {
      next.delete(key);
    }

    originalValues.value = next;
  };

  /** 수정된 셀이 하나라도 있는지 */
  const isDirty = computed(() => originalValues.value.size > 0);

  /**
   * 특정 셀이 수정되었는지 확인합니다.
   * 셀 스타일링(modified-cell 클래스 등)에 사용.
   */
  const isCellDirty = (rowKey: string, field: string): boolean => {
    return originalValues.value.has(`${rowKey}:${field}`);
  };

  /** 특정 행에 수정된 셀이 있는지 확인합니다. */
  const isRowDirty = (rowKey: string): boolean => {
    for (const key of originalValues.value.keys()) {
      if (key.startsWith(`${rowKey}:`)) return true;
    }
    return false;
  };

  /**
   * 특정 셀의 원본값을 반환합니다.
   * 되돌리기(undo) 기능에 사용.
   */
  const getOriginalValue = (
    rowKey: string,
    field: string,
  ): unknown | undefined => {
    return originalValues.value.get(`${rowKey}:${field}`);
  };

  /**
   * 수정된 행 목록을 반환합니다.
   * 저장 API 호출 시 변경된 데이터만 추출하는 데 사용.
   *
   * @param rowData - 현재 그리드 행 데이터 배열
   */
  const getChanges = (rowData: Record<string, unknown>[]): RowChange[] => {
    const result = new Map<
      string,
      Record<string, { original: unknown; current: unknown }>
    >();

    originalValues.value.forEach((original, key) => {
      const [rowKey, field] = key.split(":");
      const row = rowData.find((r) => String(r[rowKeyField]) === rowKey);
      const current = row?.[field];

      if (!result.has(rowKey)) {
        result.set(rowKey, {});
      }
      result.get(rowKey)![field] = { original, current };
    });

    return Array.from(result.entries()).map(([rowKey, changes]) => ({
      rowKey,
      changes,
    }));
  };

  /** 수정 추적 전체 초기화. 저장 성공 후 호출. */
  const reset = () => {
    originalValues.value = new Map();
  };

  /**
   * AG Grid context 객체.
   * ADataGrid의 :grid-options="{ context: gridEdit.context }" 로 전달합니다.
   * 셀 렌더러(ACellEditable)에서 이 context를 통해 gridEdit에 접근합니다.
   */
  const context = {
    rowKeyField,
    gridEdit: {
      isCellDirty,
      getOriginalValue,
      trackChange,
    },
  };

  /**
   * 수정 가능 컬럼 설정을 반환합니다.
   * ColDef에 스프레드하면 수정 추적, 셀 스타일, 되돌리기가 자동 적용됩니다.
   *
   * @param editOptions - 추가 옵션
   * @param editOptions.editableWhen - 조건부 편집 (행 데이터를 받아 boolean 반환)
   * @param editOptions.cellEditor - 커스텀 셀 에디터 (기본: AG Grid 기본 에디터)
   *
   * @example
   * ```typescript
   * const colDefs = [
   *   { field: 'itemName', headerName: '품명', ...gridEdit.editable() },
   *   { field: 'qty', headerName: '수량', type: 'number', ...gridEdit.editable() },
   *   // 조건부 편집
   *   { field: 'price', headerName: '단가', ...gridEdit.editable({
   *     editableWhen: (data) => data.status === 'A',
   *   })},
   * ];
   * ```
   */
  const editable = (editOptions?: {
    editableWhen?: (data: any) => boolean;
    cellEditor?: string;
  }) => {
    const { editableWhen, cellEditor } = editOptions ?? {};

    return {
      editable: editableWhen
        ? (params: any) => editableWhen(params.data)
        : true,

      ...(cellEditor ? { cellEditor } : {}),

      /** 값 설정 시 수정 추적 자동 실행 */
      valueSetter: (params: any) => {
        const field = params.colDef.field;
        const rowKey = String(params.data[rowKeyField]);
        let newValue = params.newValue;

        // 숫자 타입에서 빈 값 → 0 처리
        const isNumeric = params.colDef.type === "number"
          || params.colDef.cellEditor === "agNumberCellEditor";
        if (
          isNumeric &&
          (newValue === "" || newValue === null || newValue === undefined)
        ) {
          newValue = 0;
        }

        const originalValue = getOriginalValue(rowKey, field) ?? params.oldValue;

        params.data[field] = newValue;
        trackChange(rowKey, field, originalValue, newValue);

        return true;
      },

      /** 수정된 셀에 modified-cell 클래스 자동 적용 */
      cellClassRules: {
        "modified-cell": (params: any) => {
          const rowKey = String(params.data[rowKeyField]);
          return isCellDirty(rowKey, params.colDef.field);
        },
      },

      /** 수정 셀 렌더러 — 값 + 되돌리기 아이콘 */
      cellRenderer: ACellEditable,
    };
  };

  // ── guardStore 자동 등록 ──
  if (getCurrentScope()) {
    try {
      const guardStore = useGuardStore();
      const dirtySource = { isDirty } as any;
      const unregister = guardStore.register(dirtySource);
      onScopeDispose(unregister);
    } catch {
      // Pinia 미등록 환경 — 무시
    }
  }

  return {
    /** 수정된 셀이 하나라도 있는지 */
    isDirty,
    /** 셀 값 변경 추적 */
    trackChange,
    /** 특정 셀 수정 여부 */
    isCellDirty,
    /** 특정 행 수정 여부 */
    isRowDirty,
    /** 특정 셀 원본값 조회 */
    getOriginalValue,
    /** 수정된 행 목록 */
    getChanges,
    /** 전체 초기화 */
    reset,
    /** AG Grid context — gridOptions에 전달 */
    context,
    /** 수정 가능 컬럼 설정 — ColDef에 스프레드 */
    editable,
  };
}
