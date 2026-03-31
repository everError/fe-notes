import { onMounted, onBeforeUnmount } from 'vue';

export function useDropDetector(
  sendToParent: (type: string, payload?: Record<string, any>) => void,
) {
  function handleMessage(e: MessageEvent) {
    const data = e.data;
    if (data.source !== 'ide') return;

    if (data.type === 'dragover') {
      const result = detectDropPosition(data.x, data.y);
      sendToParent('drop-target', result ? { result } : { result: null });
    }

    if (data.type === 'dragleave') {
      sendToParent('drop-target', { result: null });
    }
  }

  function detectDropPosition(x: number, y: number) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;

    // 슬롯 드롭존 체크 (우선)
    const slotZone = el.closest('[data-slot-name]') as HTMLElement | null;
    if (slotZone) {
      const parentNodeEl = slotZone.closest('[data-node-id]') as HTMLElement;
      if (!parentNodeEl) return null;

      const parentId = parentNodeEl.getAttribute('data-node-id')!;
      const slotName = slotZone.getAttribute('data-slot-name')!;
      const childCount = slotZone.querySelectorAll(
        ':scope > [data-node-id]',
      ).length;
      const rect = slotZone.getBoundingClientRect();

      // 슬롯 내부에 자식이 있으면 자식 기준으로 before/after 계산
      const childNodeEl = el.closest('[data-node-id]') as HTMLElement | null;
      if (
        childNodeEl &&
        childNodeEl !== parentNodeEl &&
        slotZone.contains(childNodeEl)
      ) {
        return calcPositionRelativeToNode(
          childNodeEl,
          x,
          y,
          parentId,
          slotName,
          slotZone,
        );
      }

      // 빈 슬롯이면 index 0으로 inside
      return {
        parentId,
        slotName,
        index: childCount,
        indicator: {
          x: rect.x,
          y: rect.bottom - 2,
          width: rect.width,
          height: 3,
        },
      };
    }

    // children 영역 체크
    const childrenZone = el.closest('[data-children]') as HTMLElement | null;
    if (childrenZone) {
      const parentNodeEl = childrenZone.closest(
        '[data-node-id]',
      ) as HTMLElement;
      if (!parentNodeEl) return null;

      const parentId = parentNodeEl.getAttribute('data-node-id')!;
      const childCount = childrenZone.querySelectorAll(
        ':scope > [data-node-id]',
      ).length;

      const childNodeEl = el.closest('[data-node-id]') as HTMLElement | null;
      if (
        childNodeEl &&
        childNodeEl !== parentNodeEl &&
        childrenZone.contains(childNodeEl)
      ) {
        return calcPositionRelativeToNode(
          childNodeEl,
          x,
          y,
          parentId,
          undefined,
          childrenZone,
        );
      }

      const rect = childrenZone.getBoundingClientRect();
      return {
        parentId,
        slotName: undefined,
        index: childCount,
        indicator: {
          x: rect.x,
          y: rect.bottom - 2,
          width: rect.width,
          height: 3,
        },
      };
    }

    // 일반 노드 (루트 레벨)
    const nodeEl = el.closest('[data-node-id]') as HTMLElement | null;
    if (nodeEl) {
      const canvasRoot = document.getElementById('canvas-root')!;
      // 이 노드가 루트 직접 자식인지 확인
      if (
        nodeEl.parentElement === canvasRoot ||
        nodeEl.parentElement?.closest('[data-node-id]') === null
      ) {
        return calcPositionRelativeToNode(
          nodeEl,
          x,
          y,
          'root',
          undefined,
          canvasRoot,
        );
      }
    }

    // 빈 영역 → 루트 마지막에 삽입
    const rootEl = document.getElementById('canvas-root')!;
    const rootRect = rootEl.getBoundingClientRect();
    const rootChildCount = rootEl.querySelectorAll(
      ':scope > [data-node-id]',
    ).length;
    return {
      parentId: 'root',
      slotName: undefined,
      index: rootChildCount,
      indicator: {
        x: rootRect.x,
        y: rootRect.bottom,
        width: rootRect.width,
        height: 3,
      },
    };
  }

  function calcPositionRelativeToNode(
    nodeEl: HTMLElement,
    x: number,
    y: number,
    parentId: string,
    slotName: string | undefined,
    container: HTMLElement,
  ) {
    const rect = nodeEl.getBoundingClientRect();
    const nodeId = nodeEl.getAttribute('data-node-id')!;

    // 이 노드가 컨테이너이고 안쪽 영역에 마우스가 있으면 inside
    if (nodeEl.hasAttribute('data-container')) {
      const margin = Math.min(rect.width, rect.height) * 0.2;
      if (
        x > rect.left + margin &&
        x < rect.right - margin &&
        y > rect.top + margin &&
        y < rect.bottom - margin
      ) {
        // children 영역 찾기
        const childrenEl = nodeEl.querySelector(':scope > [data-children]');
        const slotEls = nodeEl.querySelectorAll(':scope > [data-slot-name]');

        if (childrenEl) {
          const cr = childrenEl.getBoundingClientRect();
          const count = childrenEl.querySelectorAll(
            ':scope > [data-node-id]',
          ).length;
          return {
            parentId: nodeId,
            slotName: undefined,
            index: count,
            indicator: {
              x: cr.x + 4,
              y: cr.bottom - 2,
              width: cr.width - 8,
              height: 3,
            },
          };
        }

        if (slotEls.length > 0) {
          // 첫 번째 슬롯에 넣기
          const firstSlot = slotEls[0] as HTMLElement;
          const sn = firstSlot.getAttribute('data-slot-name')!;
          const sr = firstSlot.getBoundingClientRect();
          const count = firstSlot.querySelectorAll(
            ':scope > [data-node-id]',
          ).length;
          return {
            parentId: nodeId,
            slotName: sn,
            index: count,
            indicator: {
              x: sr.x + 4,
              y: sr.bottom - 2,
              width: sr.width - 8,
              height: 3,
            },
          };
        }
      }
    }

    // before/after 판단
    const style = getComputedStyle(container);
    const isHorizontal =
      style.flexDirection === 'row' ||
      style.flexDirection === 'row-reverse' ||
      (style.display === 'grid' && style.gridAutoFlow?.includes('column'));

    // 형제 중 인덱스 계산
    const siblings = Array.from(
      container.querySelectorAll(':scope > [data-node-id]'),
    );
    const siblingIndex = siblings.indexOf(nodeEl);

    let position: 'before' | 'after';
    let indicator: { x: number; y: number; width: number; height: number };

    if (isHorizontal) {
      position = x - rect.left < rect.width / 2 ? 'before' : 'after';
      const ix = position === 'before' ? rect.left - 1.5 : rect.right + 1.5;
      indicator = { x: ix, y: rect.top, width: 3, height: rect.height };
    } else {
      position = y - rect.top < rect.height / 2 ? 'before' : 'after';
      const iy = position === 'before' ? rect.top - 1.5 : rect.bottom + 1.5;
      indicator = { x: rect.left, y: iy, width: rect.width, height: 3 };
    }

    return {
      parentId,
      slotName,
      index: position === 'before' ? siblingIndex : siblingIndex + 1,
      indicator,
    };
  }

  onMounted(() => window.addEventListener('message', handleMessage));
  onBeforeUnmount(() => window.removeEventListener('message', handleMessage));
}
