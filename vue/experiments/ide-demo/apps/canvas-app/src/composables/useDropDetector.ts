import { onMounted, onBeforeUnmount } from 'vue';

export function useDropDetector(
  sendToParent: (type: string, payload?: Record<string, any>) => void,
) {
  function handleMessage(e: MessageEvent) {
    const data = e.data;
    if (data.source !== 'ide') return;

    if (data.type === 'dragover') {
      const result = detectDropPosition(data.x, data.y);
      sendToParent('drop-target', { result });
    }

    if (data.type === 'dragleave') {
      sendToParent('drop-target', { result: null });
    }
  }

  /**
   * data-node-id가 있는 가장 가까운 직계 형제 노드들을 찾는다.
   * display: contents 래퍼를 무시하고 논리적 자식만 반환.
   */
  function getLogicalChildren(container: HTMLElement): HTMLElement[] {
    const result: HTMLElement[] = [];

    function walk(el: HTMLElement) {
      for (const child of Array.from(el.children) as HTMLElement[]) {
        if (child.hasAttribute('data-node-id')) {
          result.push(child);
        } else if (getComputedStyle(child).display === 'contents') {
          // display: contents 래퍼는 건너뛰고 그 안을 탐색
          walk(child);
        }
      }
    }

    walk(container);
    return result;
  }

  /**
   * 특정 nodeEl이 container의 논리적 자식 중 몇 번째인지 계산
   */
  function getLogicalIndex(
    nodeEl: HTMLElement,
    container: HTMLElement,
  ): number {
    const siblings = getLogicalChildren(container);
    return siblings.indexOf(nodeEl);
  }

  /**
   * container의 flex-direction을 읽는다.
   * display: contents면 실제 레이아웃 부모에서 읽는다.
   */
  function getFlexDirection(container: HTMLElement): 'horizontal' | 'vertical' {
    let target = container;
    let style = getComputedStyle(target);

    // display: contents면 부모로 올라감
    while (style.display === 'contents' && target.parentElement) {
      target = target.parentElement;
      style = getComputedStyle(target);
    }

    if (
      style.flexDirection === 'row' ||
      style.flexDirection === 'row-reverse'
    ) {
      return 'horizontal';
    }

    if (
      style.display === 'grid' &&
      (style.gridAutoFlow?.includes('column') ?? false)
    ) {
      return 'horizontal';
    }

    return 'vertical';
  }

  /**
   * nodeEl의 논리적 부모 컨테이너를 찾는다.
   * display: contents 래퍼가 아닌 실제 data-node-id를 가진 부모.
   */
  function getLogicalParentNode(nodeEl: HTMLElement): HTMLElement | null {
    let current = nodeEl.parentElement;
    while (current) {
      // data-slot-name이나 data-children을 가진 래퍼를 건너뜀
      if (current.hasAttribute('data-node-id')) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * nodeEl이 속한 슬롯 이름을 찾는다.
   */
  function getSlotName(nodeEl: HTMLElement): string | undefined {
    let current = nodeEl.parentElement;
    while (current) {
      if (current.hasAttribute('data-slot-name')) {
        return current.getAttribute('data-slot-name')!;
      }
      if (current.hasAttribute('data-node-id')) {
        break; // 부모 노드까지 왔으면 슬롯 밖
      }
      current = current.parentElement;
    }
    return undefined;
  }

  /**
   * nodeEl이 속한 직접 컨테이너(slot zone, children zone, 또는 canvas-root)를 찾는다.
   */
  function getDirectContainer(nodeEl: HTMLElement): HTMLElement {
    let current = nodeEl.parentElement;
    while (current) {
      if (
        current.hasAttribute('data-slot-name') ||
        current.hasAttribute('data-children') ||
        current.id === 'canvas-root'
      ) {
        return current;
      }
      // display: contents 래퍼는 건너뜀
      if (getComputedStyle(current).display === 'contents') {
        current = current.parentElement;
        continue;
      }
      current = current.parentElement;
    }
    return document.getElementById('canvas-root')!;
  }

  function detectDropPosition(x: number, y: number) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;

    // 가장 가까운 노드 요소 찾기
    const nodeEl = el.closest('[data-node-id]') as HTMLElement | null;

    if (!nodeEl) {
      // 빈 영역 → 루트 마지막에 삽입
      const rootEl = document.getElementById('canvas-root')!;
      const rootChildren = getLogicalChildren(rootEl);
      const rootRect = rootEl.getBoundingClientRect();
      return {
        parentId: 'root',
        slotName: undefined,
        index: rootChildren.length,
        indicator: {
          x: rootRect.x,
          y: rootRect.bottom,
          width: rootRect.width,
          height: 3,
        },
      };
    }

    const rect = nodeEl.getBoundingClientRect();
    const nodeId = nodeEl.getAttribute('data-node-id')!;

    // ── 컨테이너 노드의 안쪽 영역인지 판단 ──
    if (nodeEl.hasAttribute('data-container')) {
      const marginX = rect.width * 0.2;
      const marginY = rect.height * 0.2;

      const isInside =
        x > rect.left + marginX &&
        x < rect.right - marginX &&
        y > rect.top + marginY &&
        y < rect.bottom - marginY;

      if (isInside) {
        return {
          parentId: nodeId,
          slotName: undefined,
          index: 0,
          indicator: {
            x: rect.x + 4,
            y: rect.y + rect.height / 2,
            width: rect.width - 8,
            height: 3,
          },
        };
      }
    }

    // ── before / after 판단 ──
    const container = getDirectContainer(nodeEl);
    const direction = getFlexDirection(container);
    const logicalParent = getLogicalParentNode(nodeEl);
    // const slotName = getSlotName(nodeEl);

    // const parentId = logicalParent
    //   ? logicalParent.getAttribute('data-node-id')!
    //   : 'root';
    let parentId: string;
    let slotName: string | undefined;

    if (container.id === 'canvas-root') {
      parentId = 'root';
      slotName = undefined;
    } else if (container.hasAttribute('data-slot-name')) {
      parentId = getLogicalParentNode(container)?.getAttribute('data-node-id')!;
      slotName = container.getAttribute('data-slot-name')!;
    } else if (container.hasAttribute('data-children')) {
      parentId = getLogicalParentNode(container)?.getAttribute('data-node-id')!;
      slotName = undefined;
    } else {
      parentId = 'root';
    }

    const siblingIndex = getLogicalIndex(nodeEl, container);

    let position: 'before' | 'after';
    let indicator: { x: number; y: number; width: number; height: number };

    if (direction === 'horizontal') {
      position = x - rect.left < rect.width / 2 ? 'before' : 'after';
      const ix = position === 'before' ? rect.left - 1.5 : rect.right + 1.5;
      indicator = { x: ix, y: rect.top, width: 3, height: rect.height };
    } else {
      position = y - rect.top < rect.height / 2 ? 'before' : 'after';
      const iy = position === 'before' ? rect.top - 1.5 : rect.bottom + 1.5;
      indicator = { x: rect.left, y: iy, width: rect.width, height: 3 };
    }

    const index = position === 'before' ? siblingIndex : siblingIndex + 1;

    const finalResult = {
      parentId,
      slotName,
      index: Math.max(0, index),
      indicator,
    };

    console.log('[DropDetector]', {
      nodeId,
      nodeType: nodeEl.getAttribute('data-node-type'),
      containerId:
        container.id ||
        container.getAttribute('data-node-id') ||
        container.getAttribute('data-children') ||
        container.getAttribute('data-slot-name'),
      direction,
      siblingIndex,
      position,
      finalIndex: finalResult.index,
      siblings: getLogicalChildren(container).map((el) =>
        el.getAttribute('data-node-id'),
      ),
    });

    return finalResult;
  }

  onMounted(() => window.addEventListener('message', handleMessage));
  onBeforeUnmount(() => window.removeEventListener('message', handleMessage));
}
