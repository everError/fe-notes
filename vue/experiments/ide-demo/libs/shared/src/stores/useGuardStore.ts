import { defineStore } from 'pinia';
import { shallowRef, computed } from 'vue';
import { useAppStore } from './useAppStore';
import type { Selection } from '../composables/useSelection';

/**
 * Selection 레지스트리 + 네비게이션 가드 store.
 *
 * useSelection()이 생성될 때 자동으로 register()되고,
 * 컴포넌트 unmount 시 자동으로 해제됩니다.
 *
 * 라우터 beforeEach에서 guardBeforeNavigation()을 호출하면
 * 활성 Selection 중 dirty가 있을 때 appStore.confirm()으로
 * 사용자 확인을 받습니다.
 *
 * @example
 * ```typescript
 * // router/index.ts
 *
 * router.beforeEach(async () => {
 *   const guardStore = useGuardStore();
 *   return guardStore.guardBeforeNavigation();
 * });
 * ```
 */
export const useGuardStore = defineStore('guard', () => {
  /**
   * 활성 Selection 인스턴스 Set.
   * shallowRef — Selection 내부의 Ref/ComputedRef를 unwrap하지 않도록.
   */
  const registry = shallowRef<Set<Selection<any>>>(new Set());

  /**
   * Selection을 레지스트리에 등록합니다.
   * useSelection() 내부에서 자동 호출됩니다.
   *
   * @returns unregister 함수 — onScopeDispose에서 호출
   */
  const register = (selection: Selection<any>): (() => void) => {
    const next = new Set(registry.value);
    next.add(selection);
    registry.value = next;

    return () => {
      const next = new Set(registry.value);
      next.delete(selection);
      registry.value = next;
    };
  };

  /** 활성 Selection 중 dirty가 하나라도 있는지 */
  const hasDirty = computed(() => {
    for (const s of registry.value) {
      if (s.isDirty.value) return true;
    }
    return false;
  });

  /**
   * 네비게이션 가드.
   * dirty Selection이 있으면 appStore.confirm()으로 사용자 확인.
   * dirty가 없으면 즉시 true 반환.
   *
   * @param message - 커스텀 컨펌 메시지
   * @returns true: 이동 허용, false: 이동 차단
   */
  const guardBeforeNavigation = async (message?: string): Promise<boolean> => {
    if (!hasDirty.value) return true;

    const appStore = useAppStore();
    return appStore.confirm(
      message ?? '변경사항이 있습니다. 저장하지 않고 이동하시겠습니까?',
    );
  };

  return {
    register,
    hasDirty,
    guardBeforeNavigation,
  };
});
