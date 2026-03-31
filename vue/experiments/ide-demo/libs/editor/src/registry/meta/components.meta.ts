import type { ComponentMeta } from '@ide-demo/editor';

export const InputTextMeta: ComponentMeta = {
  name: 'InputText',
  category: '입력',
  icon: '⌨',
  description: '텍스트 입력 필드',
  tagName: 'InputText',
  canHaveChildren: false,
  defaultProps: {
    placeholder: '입력하세요',
    type: 'text',
    disabled: false,
    class: '',
  },
  props: {
    modelValue: {
      type: 'binding',
      label: '값 (v-model)',
      description: '바인딩할 변수',
      bindingFilter: ['ref'],
    },
    placeholder: { type: 'text', label: '플레이스홀더' },
    type: {
      type: 'select',
      label: '입력 타입',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    disabled: { type: 'boolean', label: '비활성화', defaultValue: false },
    class: { type: 'text', label: 'CSS 클래스' },
  },
  events: [
    { name: 'update:modelValue', label: '값 변경', payload: 'string' },
    { name: 'focus', label: '포커스' },
    { name: 'blur', label: '포커스 해제' },
  ],
  slots: [],
};

export const SelectMeta: ComponentMeta = {
  name: 'Select',
  category: '입력',
  icon: '▾',
  description: '드롭다운 선택',
  tagName: 'Select',
  canHaveChildren: false,
  defaultProps: {
    placeholder: '선택하세요',
    options: '',
    disabled: false,
    class: '',
  },
  props: {
    modelValue: {
      type: 'binding',
      label: '값 (v-model)',
      bindingFilter: ['ref'],
    },
    placeholder: { type: 'text', label: '플레이스홀더' },
    options: {
      type: 'binding',
      label: '옵션 데이터',
      description: '옵션 배열 변수 바인딩',
      bindingFilter: ['ref', 'reactive', 'computed'],
    },
    optionLabel: {
      type: 'text',
      label: '옵션 라벨 키',
      description: '옵션 객체의 라벨 필드명',
    },
    optionValue: {
      type: 'text',
      label: '옵션 값 키',
      description: '옵션 객체의 값 필드명',
    },
    disabled: { type: 'boolean', label: '비활성화', defaultValue: false },
    class: { type: 'text', label: 'CSS 클래스' },
  },
  events: [
    { name: 'update:modelValue', label: '값 변경' },
    { name: 'change', label: '변경' },
  ],
  slots: [],
};

export const CardMeta: ComponentMeta = {
  name: 'Card',
  category: '레이아웃',
  icon: '▢',
  description: 'PrimeVue Card — 콘텐츠 컨테이너',
  tagName: 'Card',
  canHaveChildren: true,
  defaultProps: { class: '' },
  props: {
    class: { type: 'text', label: 'CSS 클래스' },
  },
  events: [],
  slots: [
    { name: 'header', label: '헤더', description: '카드 상단 영역' },
    { name: 'title', label: '타이틀', description: '카드 제목' },
    { name: 'subtitle', label: '서브타이틀', description: '카드 부제' },
    { name: 'content', label: '콘텐츠', description: '카드 본문' },
    { name: 'footer', label: '푸터', description: '카드 하단 영역' },
  ],
};

export const DivMeta: ComponentMeta = {
  name: 'Div',
  category: '레이아웃',
  icon: '▭',
  description: 'HTML div — Tailwind 레이아웃 컨테이너',
  tagName: 'div',
  canHaveChildren: true,
  defaultProps: { class: 'flex gap-2' },
  props: {
    class: {
      type: 'text',
      label: 'CSS 클래스',
      description: 'Tailwind 유틸리티로 레이아웃 설정 (flex, grid 등)',
    },
  },
  events: [],
  slots: [],
};

export const DataGridMeta: ComponentMeta = {
  name: 'DataGrid',
  category: '데이터',
  icon: '⊞',
  description: 'AG Grid 래퍼 — 데이터 그리드',
  tagName: 'DataGrid',
  canHaveChildren: false,
  defaultProps: { columns: '', pageSize: '20', class: '' },
  props: {
    rowData: {
      type: 'binding',
      label: '데이터 소스',
      description: '그리드에 표시할 배열 변수',
      bindingFilter: ['ref', 'reactive'],
    },
    columnDefs: {
      type: 'binding',
      label: '컬럼 정의',
      description: '컬럼 설정 배열 변수',
      bindingFilter: ['ref', 'reactive', 'const'],
    },
    pageSize: { type: 'number', label: '페이지 크기', defaultValue: 20 },
    pagination: { type: 'boolean', label: '페이징 사용', defaultValue: true },
    rowSelection: {
      type: 'select',
      label: '행 선택',
      options: ['', 'single', 'multiple'],
    },
    class: { type: 'text', label: 'CSS 클래스' },
  },
  events: [
    { name: 'rowClick', label: '행 클릭', payload: 'RowClickEvent' },
    { name: 'selectionChange', label: '선택 변경', payload: 'SelectionEvent' },
    { name: 'cellEdit', label: '셀 편집', payload: 'CellEditEvent' },
  ],
  slots: [],
};

export const SearchPanelMeta: ComponentMeta = {
  name: 'SearchPanel',
  category: '비즈니스',
  icon: '⌕',
  description: '검색 조건 패널 — config 기반 자동 생성',
  tagName: 'SearchPanel',
  canHaveChildren: false,
  defaultProps: { fields: '', class: '' },
  props: {
    fields: {
      type: 'binding',
      label: '검색 필드 정의',
      description: '검색 필드 설정 배열',
      bindingFilter: ['ref', 'reactive', 'const'],
    },
    modelValue: {
      type: 'binding',
      label: '검색 값 (v-model)',
      bindingFilter: ['reactive'],
    },
    class: { type: 'text', label: 'CSS 클래스' },
  },
  events: [
    { name: 'search', label: '검색', description: '검색 버튼 클릭' },
    { name: 'reset', label: '초기화', description: '초기화 버튼 클릭' },
  ],
  slots: [],
};
