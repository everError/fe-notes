import { onMounted, onBeforeUnmount } from 'vue';

export function useClickDetector(
  sendToParent: (type: string, payload?: Record<string, any>) => void,
) {
  function handleMessage(e: MessageEvent) {
    const data = e.data;
    if (data.source !== 'ide' || data.type !== 'click') return;

    const el = document.elementFromPoint(data.x, data.y);
    if (!el) {
      sendToParent('click-node', { nodeId: null });
      return;
    }

    const nodeEl = el.closest('[data-node-id]') as HTMLElement | null;
    sendToParent('click-node', {
      nodeId: nodeEl?.getAttribute('data-node-id') ?? null,
    });
  }

  onMounted(() => window.addEventListener('message', handleMessage));
  onBeforeUnmount(() => window.removeEventListener('message', handleMessage));
}
