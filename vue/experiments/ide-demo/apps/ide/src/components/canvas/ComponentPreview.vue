<template>
  <component :is="previewComponent" />
</template>

<script setup lang="ts">
import { h, computed } from 'vue';
import type { EditorNode } from '@ide-demo/editor';

/**
 * 캔버스 내 컴포넌트 간이 프리뷰
 *
 * 현재: 순수 HTML/CSS로 시뮬레이션
 * 향후: iframe 안에서 실제 사내 라이브러리 컴포넌트를 렌더링하도록 전환
 *
 * iframe 전환 시:
 * 1. iframe 내부에 Vue 앱을 마운트하고 사내 라이브러리를 app.use()로 등록
 * 2. postMessage로 props/node 정보를 주고받음
 * 3. 이 파일은 iframe wrapper로 교체됨
 */

const props = defineProps<{
  node: EditorNode;
}>();

// 색상 맵
const severityColors: Record<string, string> = {
  success: '#22c55e',
  info: '#3b82f6',
  warn: '#f59e0b',
  danger: '#ef4444',
  secondary: '#6b7280',
  contrast: '#e2e8f0',
  help: '#a855f7',
};

const previewComponent = computed(() => {
  const p = props.node.props;
  const type = props.node.type;

  switch (type) {
    case 'AButton': {
      const bg = severityColors[p.severity] || '#6366f1';
      const isOutlined = p.variant === 'outlined';
      const isText = p.variant === 'text' || p.variant === 'link';
      return () =>
        h(
          'button',
          {
            style: {
              padding:
                p.size === 'small'
                  ? '5px 10px'
                  : p.size === 'large'
                    ? '10px 20px'
                    : '7px 14px',
              fontSize:
                p.size === 'small'
                  ? '12px'
                  : p.size === 'large'
                    ? '15px'
                    : '13px',
              background: isOutlined || isText ? 'transparent' : bg,
              color: isOutlined || isText ? bg : '#fff',
              border: isOutlined ? `1.5px solid ${bg}` : 'none',
              borderRadius: p.rounded ? '999px' : '6px',
              boxShadow: p.raised ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              opacity: p.disabled ? 0.5 : 1,
              fontWeight: '600',
              textDecoration: p.variant === 'link' ? 'underline' : 'none',
              cursor: 'default',
            },
          },
          [
            p.loading
              ? h('span', { style: { marginRight: '5px' } }, '⟳')
              : null,
            p.icon
              ? h(
                  'span',
                  { style: { marginRight: p.label ? '5px' : '0' } },
                  p.icon,
                )
              : null,
            p.label || '',
          ],
        );
    }

    case 'InputText':
      return () =>
        h('input', {
          type: p.type || 'text',
          placeholder: p.placeholder || '',
          disabled: p.disabled,
          style: {
            padding: '7px 11px',
            border: '1.5px solid var(--ide-border-hover)',
            borderRadius: '6px',
            background: 'var(--ide-bg)',
            color: 'var(--ide-text)',
            fontSize: '13px',
            width: '100%',
            outline: 'none',
          },
        });

    case 'Select':
      return () =>
        h(
          'select',
          {
            disabled: p.disabled,
            style: {
              padding: '7px 11px',
              border: '1.5px solid var(--ide-border-hover)',
              borderRadius: '6px',
              background: 'var(--ide-bg)',
              color: 'var(--ide-text)',
              fontSize: '13px',
              width: '100%',
              outline: 'none',
            },
          },
          [h('option', {}, p.placeholder || '선택하세요')],
        );

    case 'DataGrid': {
      const cols = (p.columns || 'Column1,Column2,Column3')
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean);
      return () =>
        h(
          'div',
          {
            style: {
              border: '1.5px solid var(--ide-border-hover)',
              borderRadius: '6px',
              overflow: 'hidden',
              fontSize: '12px',
            },
          },
          [
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  background: 'var(--ide-surface-alt)',
                  borderBottom: '1px solid var(--ide-border)',
                },
              },
              cols.map((col: string) =>
                h(
                  'div',
                  {
                    key: col,
                    style: {
                      flex: '1',
                      padding: '8px 12px',
                      fontWeight: '700',
                      color: 'var(--ide-text-muted)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    },
                  },
                  col,
                ),
              ),
            ),
            ...[0, 1].map((row) =>
              h(
                'div',
                {
                  key: row,
                  style: {
                    display: 'flex',
                    borderBottom: '1px solid var(--ide-border)',
                  },
                },
                cols.map((col: string) =>
                  h(
                    'div',
                    {
                      key: col,
                      style: {
                        flex: '1',
                        padding: '8px 12px',
                        color: 'var(--ide-text-muted)',
                      },
                    },
                    `샘플 ${row + 1}`,
                  ),
                ),
              ),
            ),
            h(
              'div',
              {
                style: {
                  padding: '6px 12px',
                  background: 'var(--ide-surface-alt)',
                  color: 'var(--ide-text-dimmer)',
                  fontSize: '11px',
                  display: 'flex',
                  justifyContent: 'space-between',
                },
              },
              [
                h('span', {}, '총 2건'),
                h('span', {}, `페이지 크기: ${p.pageSize || 20}`),
              ],
            ),
          ],
        );
    }

    case 'SearchPanel':
      return () =>
        h(
          'div',
          {
            style: {
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
              padding: '12px',
              background: 'var(--ide-surface-alt)',
              borderRadius: '6px',
              border: '1.5px solid var(--ide-border)',
              flexWrap: 'wrap',
            },
          },
          [
            h(
              'div',
              {
                style: { display: 'flex', flexDirection: 'column', gap: '3px' },
              },
              [
                h(
                  'label',
                  {
                    style: {
                      fontSize: '10px',
                      color: 'var(--ide-text-dim)',
                      fontWeight: '600',
                    },
                  },
                  '검색어',
                ),
                h('input', {
                  style: {
                    padding: '5px 9px',
                    border: '1.5px solid var(--ide-border-hover)',
                    borderRadius: '5px',
                    background: 'var(--ide-bg)',
                    color: 'var(--ide-text)',
                    fontSize: '12px',
                  },
                  placeholder: '입력',
                }),
              ],
            ),
            h(
              'button',
              {
                style: {
                  padding: '6px 14px',
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  fontWeight: '600',
                  fontSize: '12px',
                },
              },
              '검색',
            ),
            h(
              'button',
              {
                style: {
                  padding: '6px 14px',
                  background: 'var(--ide-border)',
                  color: 'var(--ide-text-muted)',
                  border: 'none',
                  borderRadius: '5px',
                  fontWeight: '600',
                  fontSize: '12px',
                },
              },
              '초기화',
            ),
          ],
        );

    case 'Card':
      return () =>
        h(
          'div',
          {
            style: {
              borderRadius: '8px',
              overflow: 'hidden',
              fontSize: '12px',
              color: 'var(--ide-text-dim)',
            },
          },
          'Card 컴포넌트 — 슬롯에 콘텐츠를 드롭하세요',
        );

    case 'Div':
      return () =>
        h(
          'div',
          {
            style: { fontSize: '12px', color: 'var(--ide-text-dimmer)' },
          },
          `div.${(p.class || 'flex gap-2').replace(/\s+/g, '.')}`,
        );

    default:
      return () =>
        h(
          'div',
          { style: { color: 'var(--ide-text-dimmer)', fontSize: '12px' } },
          `[${type}]`,
        );
  }
});
</script>
