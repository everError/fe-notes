import type { ComponentMeta } from '@ide-demo/editor';

export const ADataGridMeta: ComponentMeta = {
  name: 'ADataGrid',
  category: '데이터',
  icon: '⊞',
  description: 'AG Grid 래퍼 — 데이터 그리드',
  tagName: 'ADataGrid',
  canHaveChildren: false,
  defaultProps: {
    multiRow: false,
    enableClickSelection: true,
    selectionCheckBox: false,
    rowCountDisplay: true,
  },
  props: {
    class: {
      type: 'text',
      label: 'CSS 클래스',
      description: 'Tailwind 유틸리티로 레이아웃 설정 (flex, grid 등)',
    },
    rowData: {
      type: 'binding',
      label: '행 데이터',
      description: 'Record<string, unknown>[] 배열 변수',
      bindingFilter: ['ref', 'reactive', 'computed'],
    },
    colDefs: {
      type: 'binding',
      label: '컬럼 정의',
      description: 'ColDef[] 배열 변수',
      bindingFilter: ['ref', 'reactive', 'const', 'computed'],
    },
    rowIds: {
      type: 'text',
      label: '행 고유키',
      description: '쉼표로 구분 (예: orderKey,detailKey)',
    },
    multiRow: { type: 'boolean', label: '다중 선택', defaultValue: false },
    enableClickSelection: {
      type: 'boolean',
      label: '클릭 선택',
      defaultValue: true,
    },
    selectionCheckBox: {
      type: 'boolean',
      label: '체크박스 표시',
      defaultValue: false,
    },
    rowCountDisplay: {
      type: 'boolean',
      label: '행 수 표시',
      defaultValue: true,
    },
    gridOptions: {
      type: 'binding',
      label: 'Grid 옵션',
      description: 'AG Grid 추가 옵션 객체',
      bindingFilter: ['ref', 'reactive', 'const'],
    },
  },
  events: [
    { name: 'rowClicked', label: '행 클릭', payload: 'GridRowSelectedParams' },
    { name: 'rowSelected', label: '행 선택', payload: 'GridRowSelectedParams' },
    { name: 'selectionChanged', label: '선택 변경', payload: 'IRowNode[]' },
    {
      name: 'cellValueChanged',
      label: '셀 값 변경',
      payload: 'CellValueChangedEvent',
    },
    {
      name: 'rowDoubleClicked',
      label: '행 더블클릭',
      payload: 'RowDoubleClickedEvent',
    },
  ],
  slots: [],
};
