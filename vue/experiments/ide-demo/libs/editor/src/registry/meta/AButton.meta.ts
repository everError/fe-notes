import type { ComponentMeta } from '@ide-demo/editor';

export const AButtonMeta: ComponentMeta = {
  name: 'AButton',
  category: '기본',
  icon: '⬜',
  description: 'PrimeVue Button 래퍼 — 기본 버튼 컴포넌트',
  tagName: 'AButton',

  canHaveChildren: false,

  defaultProps: {
    label: '버튼',
    severity: '',
    variant: '',
    size: '',
    disabled: false,
    loading: false,
    rounded: false,
    raised: false,
    fluid: false,
    iconPos: 'left',
    class: '',
  },

  props: {
    label: {
      type: 'text',
      label: '버튼 텍스트',
      description: '버튼에 표시할 텍스트',
    },
    icon: {
      type: 'text',
      label: '아이콘',
      description: 'PrimeIcons 클래스 (예: pi pi-save)',
    },
    iconPos: {
      type: 'select',
      label: '아이콘 위치',
      options: ['left', 'right', 'top', 'bottom'],
      defaultValue: 'left',
    },
    severity: {
      type: 'select',
      label: '색상 테마',
      options: [
        '',
        'secondary',
        'success',
        'info',
        'warn',
        'danger',
        'contrast',
        'help',
      ],
    },
    variant: {
      type: 'select',
      label: '스타일 변형',
      options: ['', 'outlined', 'text', 'link'],
    },
    size: {
      type: 'select',
      label: '크기',
      options: ['', 'small', 'large'],
    },
    disabled: {
      type: 'boolean',
      label: '비활성화',
      description: '버튼 비활성화',
      defaultValue: false,
    },
    loading: {
      type: 'boolean',
      label: '로딩',
      description: '로딩 스피너 표시',
      defaultValue: false,
    },
    rounded: {
      type: 'boolean',
      label: '둥근 모서리',
      defaultValue: false,
    },
    raised: {
      type: 'boolean',
      label: '그림자 효과',
      defaultValue: false,
    },
    fluid: {
      type: 'boolean',
      label: '부모 너비 맞춤',
      defaultValue: false,
    },
    badge: {
      type: 'text',
      label: '뱃지 텍스트',
    },
    badgeSeverity: {
      type: 'select',
      label: '뱃지 색상',
      options: [
        '',
        'secondary',
        'info',
        'success',
        'warn',
        'danger',
        'contrast',
      ],
    },
    class: {
      type: 'text',
      label: 'CSS 클래스',
      description: 'Tailwind 유틸리티 클래스',
    },
  },

  events: [
    {
      name: 'click',
      label: '클릭',
      description: '버튼 클릭 시 발생',
      payload: 'MouseEvent',
    },
  ],

  slots: [
    {
      name: 'default',
      label: '기본 슬롯',
      description: '버튼 내부 커스텀 콘텐츠',
    },
  ],
};
