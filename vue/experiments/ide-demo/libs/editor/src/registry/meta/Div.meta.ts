import type { ComponentMeta } from '@ide-demo/editor';

export const DivMeta: ComponentMeta = {
  name: 'Div',
  category: '레이아웃',
  icon: '▭',
  description: 'HTML div — Tailwind 레이아웃 컨테이너',
  tagName: 'div',
  canHaveChildren: true,
  defaultProps: { class: 'flex flex-col flex-1 gap-2' },
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
