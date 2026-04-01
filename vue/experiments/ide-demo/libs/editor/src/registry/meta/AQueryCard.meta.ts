import type { ComponentMeta } from '@ide-demo/editor';

export const AQueryCardMeta: ComponentMeta = {
  name: 'AQueryCard',
  category: '비즈니스',
  icon: '⌕',
  description: '검색 조건 카드 — 반응형 그리드로 검색 필드 배치',
  tagName: 'AQueryCard',
  canHaveChildren: true,
  defaultProps: {
    cols: 4,
    showSearchButton: true,
    searchLabel: '검색',
    searchIcon: 'pi pi-search',
  },
  props: {
    cols: {
      type: 'select',
      label: '컬럼 수',
      description: 'PC 기준 그리드 컬럼 수',
      options: [1, 2, 3, 4, 5, 6],
      defaultValue: 4,
    },
    showSearchButton: {
      type: 'boolean',
      label: '검색 버튼 표시',
      defaultValue: true,
    },
    searchLabel: {
      type: 'text',
      label: '검색 버튼 텍스트',
      defaultValue: '검색',
    },
    searchIcon: {
      type: 'text',
      label: '검색 버튼 아이콘',
      defaultValue: 'pi pi-search',
    },
    class: {
      type: 'text',
      label: 'CSS 클래스',
      description: 'Tailwind 유틸리티로 레이아웃 설정 (flex, grid 등)',
    },
  },
  events: [
    { name: 'search', label: '검색', description: '검색 버튼 클릭 시 발생' },
  ],
  slots: [
    {
      name: 'default',
      label: '검색 필드',
      description: 'AFormField + AInputText 등을 배치',
    },
  ],
};
