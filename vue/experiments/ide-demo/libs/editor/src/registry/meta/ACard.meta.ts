import type { ComponentMeta } from '@ide-demo/editor';

export const ACardMeta: ComponentMeta = {
  name: 'ACard',
  category: '레이아웃',
  icon: '▢',
  description: 'PrimeVue Card 래퍼 — 헤더/콘텐츠/푸터',
  tagName: 'ACard',
  canHaveChildren: true,
  defaultProps: {
    title: '카드 제목',
    icon: '',
    contentClass: '',
  },
  props: {
    title: { type: 'text', label: '제목', description: '카드 상단 제목' },
    icon: {
      type: 'text',
      label: '아이콘',
      description: 'PrimeIcons 클래스 (예: pi pi-users)',
    },
    contentClass: {
      type: 'text',
      label: '콘텐츠 클래스',
      description: 'content 영역 CSS 클래스',
    },
    class: {
      type: 'text',
      label: 'CSS 클래스',
      description: 'Tailwind 유틸리티로 레이아웃 설정 (flex, grid 등)',
    },
  },
  events: [],
  slots: [
    {
      name: 'default',
      label: '콘텐츠',
      description: '카드 본문 (ScrollPanel 내부)',
    },
    {
      name: 'headerRight',
      label: '헤더 우측',
      description: '헤더 오른쪽 영역 (버튼 등)',
    },
    { name: 'footer', label: '푸터', description: '카드 하단 영역' },
  ],
};
