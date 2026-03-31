<template>
  <div ref="containerEl" class="canvas-container">
    <!-- iframe -->
    <iframe
      ref="iframeEl"
      :src="canvasAppUrl"
      class="canvas-iframe"
      @load="onIframeLoad"
    />

    <!-- 투명 오버레이 -->
    <div
      class="canvas-overlay"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
      @click="onClick"
    >
      <!-- 선택 하이라이트 -->
      <div
        v-if="selectionRect"
        class="canvas-overlay__selection"
        :style="{
          left: selectionRect.x + 'px',
          top: selectionRect.y + 'px',
          width: selectionRect.width + 'px',
          height: selectionRect.height + 'px',
        }"
      />

      <!-- 드롭 인디케이터 -->
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

// canvas-app의 dev server 주소
const canvasAppUrl = 'http://localhost:5174';

const dropIndicator = ref<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null>(null);
const selectionRect = ref<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null>(null);
const pendingDropTarget = ref<DropTarget | null>(null);
const nodeRects = ref<
  Record<string, { x: number; y: number; width: number; height: number }>
>({});

// ─── iframe 통신 ───

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
      // 현재 트리 전송
      sendToIframe('render', { tree: toRaw(store.tree) });
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
      updateSelectionRect();
      break;

    case 'click-node':
      store.selectNode(data.nodeId);
      break;
  }
}

// ─── 트리 변경 → iframe 동기화 ───

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

// 선택 변경 → iframe에 알림
watch(
  () => store.selectedId,
  (id) => {
    if (id) {
      sendToIframe('select', { nodeId: id });
    } else {
      sendToIframe('deselect');
    }
    updateSelectionRect();
  },
);

function updateSelectionRect() {
  if (!store.selectedId || !nodeRects.value[store.selectedId]) {
    selectionRect.value = null;
    return;
  }
  selectionRect.value = nodeRects.value[store.selectedId];
}

// ─── 오버레이 이벤트 핸들러 ───

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
  // 컨테이너 바깥으로 나갔을 때만
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
  store.executeDrop(pendingDropTarget.value);
  dropIndicator.value = null;
  pendingDropTarget.value = null;
}

function onClick(e: MouseEvent) {
  if (!iframeReady.value) return;
  const coords = getIframeRelativeCoords(e);
  sendToIframe('click', coords);
}

function onIframeLoad() {
  // iframe이 로드되면 ready 메시지를 기다림
}

// ─── 라이프사이클 ───

onMounted(() => {
  window.addEventListener('message', handleIframeMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', handleIframeMessage);
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
  // 오버레이가 이벤트를 받되, 시각적으로 투명
  background: transparent;

  &__selection {
    position: absolute;
    border: 2px solid var(--ide-primary);
    border-radius: 3px;
    pointer-events: none;
    z-index: 11;
    transition: all 0.1s ease;
    box-shadow:
      0 0 0 1px var(--ide-primary),
      0 0 12px rgba(99, 102, 241, 0.2);
  }

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
