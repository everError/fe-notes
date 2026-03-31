import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

/**
 * PrimeVue useConfirm() 반환 타입.
 * primevue/confirmationservice에서 직접 import하지 않고
 * 필요한 메서드만 정의하여 결합도를 낮춥니다.
 */
interface ConfirmService {
  require: (options: {
    message: string;
    header?: string;
    icon?: string;
    acceptLabel?: string;
    rejectLabel?: string;
    accept?: () => void;
    reject?: () => void;
  }) => void;
}

/** confirm() 호출 시 전달할 수 있는 옵션 */
export interface ConfirmOptions {
  message: string;
  header?: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
}

/**
 * 앱 레벨 글로벌 UI 상태 관리 store.
 *
 * 컴포넌트 setup() 바깥(라우터 가드, 다른 store 등)에서도
 * ConfirmDialog를 띄울 수 있도록 PrimeVue useConfirm 인스턴스를 보관합니다.
 *
 * @example
 * ```typescript
 * // App.vue — 인스턴스 등록 (앱 전체에서 1회)
 * import { useConfirm } from 'primevue/useconfirm';
 *
 * const appStore = useAppStore();
 * appStore.setConfirm(useConfirm());
 * ```
 *
 * @example
 * ```typescript
 * // 라우터 가드, store 등 어디서든
 *
 * const appStore = useAppStore();
 * const proceed = await appStore.confirm('변경사항이 있습니다. 진행하시겠습니까?');
 * ```
 */
export const useAppStore = defineStore('app', () => {
  /** PrimeVue useConfirm() 인스턴스 */
  const confirmService = shallowRef<ConfirmService | null>(null);

  /**
   * PrimeVue useConfirm() 인스턴스를 등록합니다.
   * App.vue에서 한 번만 호출하면 됩니다.
   */
  const setConfirm = (instance: ConfirmService) => {
    confirmService.value = instance;
  };

  /**
   * 어디서든 ConfirmDialog를 띄우고 사용자 응답을 기다립니다.
   *
   * - 문자열 전달: 기본 설정으로 확인/취소 다이얼로그
   * - 옵션 객체 전달: header, icon, 버튼 텍스트 커스터마이즈
   * - confirmService가 없으면 즉시 true 반환 (안전한 fallback)
   *
   * @returns true: 확인, false: 취소
   */
  const confirm = (
    messageOrOptions: string | ConfirmOptions,
  ): Promise<boolean> => {
    if (!confirmService.value) {
      console.warn('[useAppStore] confirmService가 등록되지 않았습니다.');
      return Promise.resolve(true);
    }

    const options: ConfirmOptions =
      typeof messageOrOptions === 'string'
        ? { message: messageOrOptions }
        : messageOrOptions;

    return new Promise<boolean>((resolve) => {
      confirmService.value!.require({
        message: options.message,
        header: options.header ?? '확인',
        icon: options.icon ?? 'pi pi-exclamation-triangle',
        acceptLabel: options.acceptLabel ?? '진행',
        rejectLabel: options.rejectLabel ?? '취소',
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  };

  return {
    setConfirm,
    confirm,
  };
});
