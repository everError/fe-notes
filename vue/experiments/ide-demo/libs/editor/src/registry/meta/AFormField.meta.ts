import type { ComponentMeta } from '@ide-demo/editor';

export const AFormFieldMeta: ComponentMeta = {
  name: 'AFormField',
  category: '입력',
  icon: '⊟',
  description: '폼 필드 래퍼 — 라벨 + 입력 컴포넌트 + 에러 메시지',
  tagName: 'AFormField',
  canHaveChildren: true,
  defaultProps: {
    label: '필드명',
    labelPosition: 'float',
    labelWidth: '120px',
    required: false,
    helpText: '',
    errorMessage: '',
  },
  props: {
    label: { type: 'text', label: '라벨' },
    labelPosition: {
      type: 'select',
      label: '라벨 위치',
      options: ['float', 'vertical', 'horizontal'],
      defaultValue: 'float',
    },
    labelWidth: {
      type: 'text',
      label: '라벨 너비',
      description: 'horizontal 모드에서 라벨 너비 (예: 120px)',
      defaultValue: '120px',
    },
    required: { type: 'boolean', label: '필수 여부', defaultValue: false },
    helpText: {
      type: 'text',
      label: '도움말',
      description: '인풋 아래 가이드 텍스트',
    },
    errorMessage: {
      type: 'text',
      label: '에러 메시지',
      description: '유효성 검사 에러 메시지',
    },
  },
  events: [],
  slots: [
    {
      name: 'default',
      label: '입력 컴포넌트',
      description: 'InputText, InputNumber 등',
    },
  ],
};
