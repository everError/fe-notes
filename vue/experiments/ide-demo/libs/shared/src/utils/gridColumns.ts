import type { ColDef } from 'ag-grid-community';
import type { ButtonColumnOptions } from '../types/grid';
import ACellButton from '../components/grid/ACellButton.vue';

/**
 * 그리드 컬럼 헬퍼 유틸리티.
 * ColDef에 스프레드하여 사용합니다.
 *
 * @example
 * ```typescript
 *
 * const colDefs = [
 *   { field: 'itemNo', headerName: '품번' },
 *   {
 *     headerName: '상세',
 *     ...gridColumns.button({ label: '보기', onClick: (data) => openDetail(data) }),
 *   },
 * ];
 * ```
 */
export const gridColumns = {
  /**
   * 버튼 컬럼.
   * 셀에 클릭 가능한 버튼을 표시합니다.
   *
   * @param options.label - 버튼 텍스트
   * @param options.onClick - 클릭 핸들러 (행 데이터를 받음)
   * @param options.hide - 조건부 숨김 (true 반환 시 버튼 숨김)
   * @param options.width - 컬럼 너비 (기본: 80)
   *
   * @example
   * ```typescript
   * // 기본
   * { headerName: '상세', ...gridColumns.button({ label: '보기', onClick: openDetail }) }
   *
   * // 조건부 숨김
   * { headerName: '삭제', ...gridColumns.button({
   *   label: '삭제',
   *   onClick: deleteItem,
   *   hide: (data) => data.status === 'I',
   * })}
   * ```
   */
  button: (options: ButtonColumnOptions): Partial<ColDef> => {
    const { label, onClick, hide, width = 80 } = options;

    return {
      width,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: ACellButton,
      cellRendererParams: (params: any) => {
        if (hide?.(params.data)) {
          return { hidden: true };
        }
        return {
          label,
          onClick: () => onClick(params.data),
        };
      },
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
      },
    };
  },
};
