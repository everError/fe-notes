import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import type { EditorNode } from '@ide-demo/editor';

export function useParentBridge() {
  const tree = ref<EditorNode[]>([]);
  const selectedId = ref<string | null>(null);
  const script = ref('');
  const editMode = ref(true);

  function sendToParent(type: string, payload: Record<string, any> = {}) {
    window.parent.postMessage({ source: 'canvas-app', type, ...payload }, '*');
  }

  function sendNodeRects() {
    const els = document.querySelectorAll('[data-node-id]');
    const rects: Record<
      string,
      { x: number; y: number; width: number; height: number }
    > = {};
    els.forEach((el) => {
      const id = el.getAttribute('data-node-id')!;
      const r = el.getBoundingClientRect();
      rects[id] = { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    sendToParent('node-rects', { rects });
  }

  function handleMessage(e: MessageEvent) {
    const data = e.data;
    if (data.source !== 'ide') return;

    switch (data.type) {
      case 'render':
        tree.value = data.tree;
        nextTick(() => {
          requestAnimationFrame(() => sendNodeRects());
        });
        break;

      case 'execute-script':
        script.value = data.script;
        break;

      case 'select':
        selectedId.value = data.nodeId;
        break;

      case 'deselect':
        selectedId.value = null;
        break;

      case 'request-rects':
        sendNodeRects();
        break;

      case 'set-edit-mode':
        editMode.value = data.value;
        break;
    }
  }

  watch(
    tree,
    () => {
      nextTick(() => {
        requestAnimationFrame(() => sendNodeRects());
      });
    },
    { deep: true },
  );

  onMounted(() => {
    window.addEventListener('message', handleMessage);
    sendToParent('ready');
  });

  onBeforeUnmount(() => {
    window.removeEventListener('message', handleMessage);
  });

  return { tree, selectedId, script, editMode, sendToParent, sendNodeRects };
}
