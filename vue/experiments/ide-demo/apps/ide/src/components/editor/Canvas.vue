<template>
  <div ref="containerEl" class="canvas-container">
    <iframe
      ref="iframeEl"
      :src="canvasAppUrl"
      class="canvas-iframe"
      @load="onIframeLoad"
    />

    <!-- 편집 모드일 때만 오버레이 표시 -->
    <div
      v-if="editMode"
      class="canvas-overlay"
      :draggable="!!store.selectedId"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
      @click="onClick"
      @dragstart="onOverlayDragStart"
      @dragend="onOverlayDragEnd"
    >
      <!-- <div
        v-if="selectionRect"
        class="canvas-overlay__selection"
        :style="{
          left: selectionRect.x + 'px',
          top: selectionRect.y + 'px',
          width: selectionRect.width + 'px',
          height: selectionRect.height + 'px',
        }"
      /> -->

      <div
        v-if="dropIndicator"
        class="canvas-overlay__indicator"
        :style="{
          left: dropIndicator.x + 'px',
          top: dropIndicator.y + 'px',
          width: dropIndicator.width + 'px',
          height: dropIndicator.height + 'px',
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, toRaw } from 'vue';
import { useEditorStore } from '@/composables/useEditorStore';
import type { DropTarget } from '@ide-demo/editor';

const store = useEditorStore();

const containerEl = ref<HTMLElement>();
const iframeEl = ref<HTMLIFrameElement>();
const iframeReady = ref(false);
const editMode = ref(true);

const canvasAppUrl = 'http://localhost:5174';

const dropIndicator = ref<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null>(null);
// const selectionRect = ref<{
//   x: number;
//   y: number;
//   width: number;
//   height: number;
// } | null>(null);
const pendingDropTarget = ref<DropTarget | null>(null);
const nodeRects = ref<
  Record<string, { x: number; y: number; width: number; height: number }>
>({});

function sendToIframe(type: string, payload: Record<string, any> = {}) {
  if (!iframeEl.value?.contentWindow) return;
  iframeEl.value.contentWindow.postMessage(
    { source: 'ide', type, ...payload },
    '*',
  );
}

function handleIframeMessage(e: MessageEvent) {
  const data = e.data;
  if (data.source !== 'canvas-app') return;

  switch (data.type) {
    case 'ready':
      iframeReady.value = true;
      sendToIframe('render', {
        tree: JSON.parse(JSON.stringify(toRaw(store.tree))),
      });
      break;

    case 'drop-target':
      if (data.result) {
        dropIndicator.value = data.result.indicator;
        pendingDropTarget.value = {
          parentId: data.result.parentId,
          slotName: data.result.slotName,
          index: data.result.index,
        };
      } else {
        dropIndicator.value = null;
        pendingDropTarget.value = null;
      }
      break;

    case 'node-rects':
      nodeRects.value = data.rects;
      // updateSelectionRect();
      break;

    case 'click-node':
      store.selectNode(data.nodeId);
      break;
    case 'script-result':
      store.scriptStatus = data;
      break;
  }
}

watch(
  () => store.tree,
  (newTree) => {
    if (!iframeReady.value) return;
    sendToIframe('render', {
      tree: JSON.parse(JSON.stringify(toRaw(newTree))),
    });
  },
  { deep: true },
);

watch(
  () => store.selectedId,
  (id) => {
    if (id) {
      sendToIframe('select', { nodeId: id });
    } else {
      sendToIframe('deselect');
    }
    // updateSelectionRect();
  },
);

// function updateSelectionRect() {
//   if (!store.selectedId || !nodeRects.value[store.selectedId]) {
//     selectionRect.value = null;
//     return;
//   }
//   selectionRect.value = nodeRects.value[store.selectedId];
// }

function getIframeRelativeCoords(e: MouseEvent) {
  const rect = iframeEl.value!.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function onDragOver(e: DragEvent) {
  if (!store.isDragging || !iframeReady.value) return;
  e.dataTransfer!.dropEffect =
    store.dragItem?.source === 'palette' ? 'copy' : 'move';
  const coords = getIframeRelativeCoords(e);
  sendToIframe('dragover', coords);
}

function onDragLeave(e: DragEvent) {
  const rect = containerEl.value!.getBoundingClientRect();
  if (
    e.clientX < rect.left ||
    e.clientX > rect.right ||
    e.clientY < rect.top ||
    e.clientY > rect.bottom
  ) {
    sendToIframe('dragleave');
    dropIndicator.value = null;
    pendingDropTarget.value = null;
  }
}

function onDrop() {
  if (!store.dragItem || !pendingDropTarget.value) return;
  console.log('[Canvas] onDrop', {
    dragItem: JSON.stringify(store.dragItem),
    dropTarget: JSON.stringify(pendingDropTarget.value),
  });
  store.executeDrop(pendingDropTarget.value);
  dropIndicator.value = null;
  pendingDropTarget.value = null;
}

function onClick(e: MouseEvent) {
  if (!iframeReady.value) return;
  const coords = getIframeRelativeCoords(e);
  sendToIframe('click', coords);
}

function onOverlayDragStart(e: DragEvent) {
  if (!store.selectedId) {
    e.preventDefault();
    return;
  }

  e.dataTransfer!.setData('text/plain', store.selectedId);
  e.dataTransfer!.effectAllowed = 'move';
  store.startDrag({ source: 'canvas', id: store.selectedId });

  // 드래그 이미지를 작게 (기본 오버레이 전체가 드래그 이미지가 되는 걸 방지)
  const ghost = document.createElement('div');
  ghost.textContent = store.selectedNode?.type ?? '';
  ghost.style.cssText =
    'position:fixed;top:-100px;padding:4px 10px;background:#6366f1;color:#fff;border-radius:4px;font-size:12px;font-weight:600;';
  document.body.appendChild(ghost);
  e.dataTransfer!.setDragImage(ghost, 0, 0);
  setTimeout(() => document.body.removeChild(ghost), 0);
}

function onOverlayDragEnd() {
  store.endDrag();
}

function onIframeLoad() {}

function applyScript() {
  if (!iframeReady.value) return;
  sendToIframe('execute-script', { script: store.script });
}

function setEditMode(value: boolean) {
  editMode.value = value;
  sendToIframe('set-edit-mode', { value });
  if (value) {
    requestRectsUpdate();
  }
}

defineExpose({ applyScript, setEditMode, editMode });

let resizeObserver: ResizeObserver | null = null;

function requestRectsUpdate() {
  if (!iframeReady.value) return;
  sendToIframe('request-rects');
}

onMounted(() => {
  window.addEventListener('message', handleIframeMessage);

  resizeObserver = new ResizeObserver(() => {
    requestRectsUpdate();
  });
  if (containerEl.value) {
    resizeObserver.observe(containerEl.value);
  }

  window.addEventListener('resize', requestRectsUpdate);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', handleIframeMessage);
  window.removeEventListener('resize', requestRectsUpdate);
  resizeObserver?.disconnect();
});
</script>

<style scoped lang="scss">
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.canvas-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background: transparent;

  // &__selection {
  //   position: absolute;
  //   border: 2px solid var(--ide-primary);
  //   border-radius: 3px;
  //   pointer-events: none;
  //   z-index: 11;
  //   transition: all 0.1s ease;
  //   box-shadow:
  //     0 0 0 1px var(--ide-primary),
  //     0 0 12px rgba(99, 102, 241, 0.2);
  // }

  &__indicator {
    position: absolute;
    background: var(--ide-primary);
    border-radius: 2px;
    pointer-events: none;
    z-index: 12;
    animation: pulse-indicator 1s ease-in-out infinite;
  }
}

@keyframes pulse-indicator {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
