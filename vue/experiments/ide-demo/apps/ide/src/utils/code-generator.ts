import type { EditorNode } from '@ide-demo/editor';
import { componentRegistry } from '@ide-demo/editor';
import { parseScriptCode } from '@/composables/useScriptParser';

/**
 * 에디터 노드 트리를 .vue 파일 코드로 변환
 */
import { useSettings } from '@ide-demo/shared';

export function generateVueCode(tree: EditorNode[], script: string): string {
  const template = generateTemplate(tree, 2);
  let code = `<template>\n  <div>\n${template}\n  </div>\n</template>\n\n${script}\n`;

  // 설정의 문자열 치환 적용
  const { settings } = useSettings();
  for (const rule of settings.value.codeReplacements) {
    if (rule.from && rule.to) {
      code = code.replaceAll(rule.from, rule.to);
    }
  }

  return code;
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
    const isBind =
      node.bindModes?.[key] === true || propDef?.type === 'binding';

    // class는 항상 정적
    if (key === 'class' && value) {
      parts.push(`class="${value}"`);
      continue;
    }

    // 바인딩 모드
    if (isBind) {
      if (key === 'modelValue') {
        parts.push(`v-model="${value}"`);
      } else {
        parts.push(`:${key}="${value}"`);
      }
      continue;
    }

    // boolean
    if (typeof value === 'boolean') {
      if (value) {
        parts.push(key);
      } else if (propDef?.defaultValue !== false) {
        parts.push(`:${key}="false"`);
      }
      continue;
    }

    // 숫자
    if (typeof value === 'number') {
      parts.push(`:${key}="${value}"`);
      continue;
    }

    // 문자열
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
