import { useConfirm } from 'primevue/useconfirm';

/** 다이얼로그 옵션 */
export interface DialogOptions {
  /** 다이얼로그 본문 메시지 */
  message: string;
  /** 다이얼로그 헤더 텍스트 */
  header?: string;
  /** 헤더 좌측 아이콘 (PrimeIcons 클래스) */
  icon?: string;
  /** 확인 버튼 텍스트 */
  acceptLabel?: string;
  /** 취소 버튼 텍스트 */
  rejectLabel?: string;
}

/**
 * PrimeVue ConfirmDialog를 편하게 사용하기 위한 composable.
 * ConfirmationService가 app에 등록되어 있어야 합니다 (createWeb이 자동 등록).
 *
 * @example
 * ```ts
 * const { showConfirm, showAlert, showDeleteConfirm } = useDialog();
 *
 * // 확인/취소 다이얼로그
 * showConfirm(
 *   { message: '진행하시겠습니까?', header: '확인' },
 *   () => {  확인  },
 *   () => {  취소  }
 * );
 *
 * // 알림 다이얼로그 (확인 버튼만)
 * showAlert('저장되었습니다.');
 *
 * // 삭제 확인 다이얼로그
 * showDeleteConfirm(() => {  삭제 실행  });
 * ```
 */
export function useDialog() {
  const confirm = useConfirm();

  /**
   * 확인/취소 다이얼로그를 표시합니다.
   *
   * @param options - 메시지, 헤더, 아이콘, 버튼 텍스트 설정
   * @param onAccept - 확인 버튼 클릭 시 콜백
   * @param onReject - 취소 버튼 클릭 시 콜백
   */
  const showConfirm = (
    options: DialogOptions,
    onAccept?: () => void,
    onReject?: () => void,
  ) => {
    confirm.require({
      message: options.message,
      header: options.header ?? '확인',
      icon: options.icon ?? 'pi pi-question-circle',
      acceptLabel: options.acceptLabel ?? '확인',
      rejectLabel: options.rejectLabel ?? '취소',
      accept: onAccept,
      reject: onReject,
    });
  };

  /**
   * 알림 다이얼로그를 표시합니다 (확인 버튼만).
   *
   * @param message - 알림 메시지
   * @param header - 헤더 텍스트 (기본: '알림')
   * @param icon - 아이콘 (기본: pi-info-circle)
   * @param onAccept - 확인 클릭 시 콜백
   */
  const showAlert = (
    message: string,
    header?: string,
    icon?: string,
    onAccept?: () => void,
  ) => {
    confirm.require({
      message,
      header: header ?? '알림',
      icon: icon ?? 'pi pi-info-circle',
      acceptLabel: '확인',
      rejectClass: 'hidden',
      accept: onAccept,
    });
  };

  /**
   * 삭제 확인 다이얼로그를 표시합니다.
   * 아이콘과 메시지가 삭제에 맞게 프리셋되어 있습니다.
   *
   * @param onAccept - 확인(삭제) 클릭 시 콜백
   * @param onReject - 취소 클릭 시 콜백
   */
  const showDeleteConfirm = (onAccept: () => void, onReject?: () => void) => {
    showConfirm(
      {
        message: '삭제하시겠습니까?',
        header: '삭제 확인',
        icon: 'pi pi-exclamation-triangle',
      },
      onAccept,
      onReject,
    );
  };

  return {
    showConfirm,
    showAlert,
    showDeleteConfirm,
  };
}
