import type { EditorNode } from '@ide-demo/editor';
import { componentRegistry } from '@ide-demo/editor';
import { parseScriptCode } from '@/composables/useScriptParser';

/**
 * 에디터 노드 트리를 .vue 파일 코드로 변환
 */
export function generateVueCode(tree: EditorNode[], script: string): string {
  const template = generateTemplate(tree, 2);
  return `<template>\n  <div>\n${template}\n  </div>\n</template>\n\n${script}\n`;
}

/** 노드 배열 → template 코드 */
function generateTemplate(nodes: EditorNode[], indent: number): string {
  return nodes.map((node) => generateNodeCode(node, indent)).join('\n');
}

/** 단일 노드 → template 코드 */
function generateNodeCode(node: EditorNode, indent: number): string {
  const meta = componentRegistry[node.type];
  if (!meta) return '';

  const pad = '  '.repeat(indent);
  const tagName = meta.tagName || node.type;

  // props 문자열 생성
  const propsStr = generatePropsString(node);

  // events 문자열 생성
  const eventsStr = generateEventsString(node);

  const attrs = [propsStr, eventsStr].filter(Boolean).join(' ');
  const openTag = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;

  // 자식/슬롯이 없으면 self-closing
  const hasSlotContent = Object.values(node.slots).some((s) => s.length > 0);
  const hasChildren = node.children.length > 0;

  if (!hasSlotContent && !hasChildren) {
    return `${pad}<${tagName}${attrs ? ' ' + attrs : ''} />`;
  }

  // 자식/슬롯이 있으면 열고 닫기
  let inner = '';

  // 슬롯 렌더링
  for (const [slotName, slotNodes] of Object.entries(node.slots)) {
    if (slotNodes.length > 0) {
      inner += `\n${pad}  <template #${slotName}>`;
      inner += `\n${generateTemplate(slotNodes, indent + 2)}`;
      inner += `\n${pad}  </template>`;
    }
  }

  // children 렌더링
  if (hasChildren) {
    inner += `\n${generateTemplate(node.children, indent + 1)}`;
  }

  return `${pad}${openTag}${inner}\n${pad}</${tagName}>`;
}

/** props → 속성 문자열 */
function generatePropsString(node: EditorNode): string {
  const parts: string[] = [];
  const meta = componentRegistry[node.type];
  if (!meta) return '';

  for (const [key, value] of Object.entries(node.props)) {
    if (value === undefined || value === null || value === '') continue;

    const propDef = meta.props[key];

    // class는 항상 정적 바인딩
    if (key === 'class' && value) {
      parts.push(`class="${value}"`);
      continue;
    }

    // boolean: true면 속성만, false면 생략 (기본값이 false인 경우)
    if (typeof value === 'boolean') {
      if (value) {
        parts.push(key);
      } else if (propDef?.defaultValue !== false) {
        parts.push(`:${key}="false"`);
      }
      continue;
    }

    // binding 타입이면 v-bind
    if (propDef?.type === 'binding') {
      if (key === 'modelValue') {
        parts.push(`v-model="${value}"`);
      } else {
        parts.push(`:${key}="${value}"`);
      }
      continue;
    }

    // 일반 문자열
    parts.push(`${key}="${value}"`);
  }

  return parts.join(' ');
}

/** events → 이벤트 바인딩 문자열 */
function generateEventsString(node: EditorNode): string {
  return Object.entries(node.events)
    .filter(([_, handler]) => handler)
    .map(([event, handler]) => `@${event}="${handler}"`)
    .join(' ');
}

/**
 * 내보내기 결과를 클립보드에 복사
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}
