import {
  ref,
  computed,
  onScopeDispose,
  getCurrentScope,
  type Ref,
  type ComputedRef,
} from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useGuardStore } from "../stores/useGuardStore";

/** useSelection 초기화 옵션 */
export interface SelectionOptions {
  /** guard() 호출 시 기본 컨펌 메시지 */
  guardMessage?: string;
  /** guard() 다이얼로그 헤더 텍스트 */
  guardHeader?: string;
}

/** 선택 + 변경 추적 핸들 인터페이스 */
export interface Selection<T extends Record<string, any>> {
  /** 편집 중인 데이터 — 원본의 deep clone. 폼에 v-model 바인딩용 */
  data: Ref<T | null>;
  /** 선택 시점의 원본 데이터 — 읽기 전용. dirty 비교 기준 */
  original: Ref<T | null>;
  /** 데이터가 선택(또는 생성)되어 있는지 여부 */
  hasSelection: ComputedRef<boolean>;
  /** create()로 생성된 신규 데이터인지 여부. 저장 시 POST/PUT 분기에 사용 */
  isNew: Ref<boolean>;
  /** 원본 대비 현재 데이터가 변경되었는지 여부 */
  isDirty: ComputedRef<boolean>;
  /** 변경된 필드명 목록 (예: ['itemName', 'qty']) */
  dirtyFields: ComputedRef<string[]>;
  /** 기존 행 선택 — deep clone하여 폼에 바인딩. isNew = false */
  select: (row: T) => void;
  /** 신규 생성 — 초기값을 deep clone하여 폼에 바인딩. isNew = true */
  create: (defaults: T) => void;
  /** 저장 성공 후 호출 — 현재 data를 새 original로 설정하여 dirty 초기화 */
  commit: () => void;
  /** 수정 취소 — original로 data를 되돌림 */
  reset: () => void;
  /** 선택 해제 — data, original 모두 null로 초기화 */
  clear: () => void;
  /**
   * dirty 가드 — 변경사항이 있으면 컨펌 다이얼로그를 띄움.
   * dirty가 아니면 즉시 true 반환.
   * 조회, 행 전환, 페이지 이동 등 데이터 유실 위험이 있는 동작 전에 호출.
   */
  guard: (message?: string) => Promise<boolean>;
}

/**
 * 행 선택 + 변경 추적 composable.
 *
 * 그리드 행 선택 → 폼 바인딩 → dirty check → 저장/취소 흐름을 지원합니다.
 * 선택 시 deep clone(structuredClone)으로 원본과 편집 데이터를 분리하여
 * 폼 수정이 그리드 데이터에 영향을 주지 않습니다.
 *
 * 생성 시 useGuardStore에 자동 등록되며,
 * 컴포넌트 unmount 시 자동 해제됩니다.
 *
 * @param options - guard 메시지 등 초기 설정
 *
 * @example
 * ```ts
 * const selection = useSelection<Item>();
 *
 * // 그리드 행 선택
 * selection.select(row);
 *
 * // 폼에서 수정
 * selection.data.value!.itemName = '새 이름';
 * selection.isDirty.value // true
 * selection.dirtyFields.value // ['itemName']
 *
 * // 저장 후
 * selection.commit(); // isDirty → false
 *
 * // 되돌리기
 * selection.reset(); // data → original 복원
 *
 * // 조회 전 가드
 * const proceed = await selection.guard();
 * if (!proceed) return; // 사용자가 취소함
 * ```
 */
export function useSelection<T extends Record<string, any>>(
  options?: SelectionOptions,
): Selection<T> {
  // PrimeVue ConfirmDialog 서비스
  const confirm = useConfirm();

  /** 편집 중인 데이터 — 원본의 deep clone */
  const data = ref<T | null>(null) as Ref<T | null>;

  /** 선택 시점의 원본 — dirty 비교 기준 */
  const original = ref<T | null>(null) as Ref<T | null>;

  /** create()로 생성된 신규 데이터인지 여부 */
  const isNew = ref(false);

  /** 데이터가 선택/생성되어 있는지 */
  const hasSelection = computed(() => data.value !== null);

  /**
   * 원본 대비 변경 여부.
   * JSON.stringify 비교로 deep equality 체크.
   * 대용량 객체에서는 성능 이슈가 있을 수 있으나
   * 일반적인 폼 데이터 규모에서는 충분.
   */
  const isDirty = computed(() => {
    if (!data.value || !original.value) return false;
    return JSON.stringify(data.value) !== JSON.stringify(original.value);
  });

  /** 변경된 필드명 목록 — UI에서 변경 표시 등에 활용 */
  const dirtyFields = computed(() => {
    if (!data.value || !original.value) return [];
    const fields: string[] = [];
    for (const key of Object.keys(data.value)) {
      if (
        JSON.stringify(data.value[key]) !== JSON.stringify(original.value[key])
      ) {
        fields.push(key);
      }
    }
    return fields;
  });

  /**
   * 기존 행 선택.
   * structuredClone으로 deep copy하여 폼 수정이 원본에 영향 없도록 함.
   */
  const select = (row: T) => {
    original.value = structuredClone(row);
    data.value = structuredClone(row);
    isNew.value = false;
  };

  /**
   * 신규 생성.
   * 초기값을 넘기면 deep clone하여 폼에 바인딩.
   * isNew = true → 저장 시 POST 분기에 사용.
   */
  const create = (defaults: T) => {
    original.value = structuredClone(defaults);
    data.value = structuredClone(defaults);
    isNew.value = true;
  };

  /**
   * 저장 성공 후 호출.
   * 현재 data를 새 original로 설정하여 isDirty = false로 만듦.
   * isNew도 false로 전환 (이제 기존 데이터).
   */
  const commit = () => {
    if (data.value) {
      original.value = structuredClone(data.value);
      isNew.value = false;
    }
  };

  /** 수정 취소 — original을 다시 data에 복사하여 폼을 원래 상태로 되돌림 */
  const reset = () => {
    if (original.value) {
      data.value = structuredClone(original.value);
    }
  };

  /** 선택 해제 — 모든 상태 초기화 */
  const clear = () => {
    data.value = null;
    original.value = null;
    isNew.value = false;
  };

  /**
   * dirty 가드.
   * - isDirty가 false면 즉시 true 반환 (진행 허용)
   * - isDirty가 true면 PrimeVue ConfirmDialog를 띄워 사용자 응답 대기
   * - '진행' 클릭 → true, '취소' 클릭 → false 반환
   *
   * @param message - 컨펌 메시지 (미지정 시 options.guardMessage 또는 기본 메시지 사용)
   */
  const guard = (message?: string): Promise<boolean> => {
    // dirty 아니면 즉시 진행
    if (!isDirty.value) return Promise.resolve(true);

    return new Promise((resolve) => {
      confirm.require({
        message:
          message ??
          options?.guardMessage ??
          "변경사항이 있습니다. 저장하지 않고 진행하시겠습니까?",
        header: options?.guardHeader ?? "확인",
        icon: "pi pi-exclamation-triangle",
        acceptLabel: "진행",
        rejectLabel: "취소",
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  };

  // ── 반환 객체 구성 ──

  const selection: Selection<T> = {
    data,
    original,
    hasSelection,
    isNew,
    isDirty,
    dirtyFields,
    select,
    create,
    commit,
    reset,
    clear,
    guard,
  };

  // ── guardStore 자동 등록/해제 ──
  // 컴포넌트 setup scope가 있을 때만 등록
  // unmount 시 onScopeDispose로 자동 해제
  if (getCurrentScope()) {
    try {
      const guardStore = useGuardStore();
      const unregister = guardStore.register(selection);
      onScopeDispose(unregister);
    } catch {
      // Pinia 미등록 환경 (Storybook 등) — 무시
    }
  }

  return selection;
}
