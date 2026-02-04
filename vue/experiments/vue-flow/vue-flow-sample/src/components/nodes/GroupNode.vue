<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { NodeData } from "../../types";

const props = defineProps<NodeProps<NodeData>>();

const emit = defineEmits<{
  resize: [width: number, height: number];
}>();

const isSelected = computed(() => props.selected);

// 리사이즈 상태
const isResizing = ref(false);
const startPos = ref({ x: 0, y: 0 });
const startSize = ref({ width: 0, height: 0 });

// 로컬 크기 상태
const localWidth = ref(250);
const localHeight = ref(150);

// 초기값 설정
function initSize() {
  const w = props.data?.properties?.width;
  const h = props.data?.properties?.height;
  if (w) localWidth.value = w;
  if (h) localHeight.value = h;
}

initSize();

watch(
  () => props.data?.properties?.width,
  (newVal) => {
    if (newVal && !isResizing.value) {
      localWidth.value = newVal;
    }
  },
);

watch(
  () => props.data?.properties?.height,
  (newVal) => {
    if (newVal && !isResizing.value) {
      localHeight.value = newVal;
    }
  },
);

function onResizeStart(event: MouseEvent) {
  isResizing.value = true;
  startPos.value = { x: event.clientX, y: event.clientY };
  startSize.value = { width: localWidth.value, height: localHeight.value };

  document.addEventListener("mousemove", onResizeMove);
  document.addEventListener("mouseup", onResizeEnd);
  event.stopPropagation();
  event.preventDefault();
}

function onResizeMove(event: MouseEvent) {
  if (!isResizing.value) return;

  const dx = event.clientX - startPos.value.x;
  const dy = event.clientY - startPos.value.y;

  localWidth.value = Math.max(150, startSize.value.width + dx);
  localHeight.value = Math.max(100, startSize.value.height + dy);
}

function onResizeEnd() {
  if (!isResizing.value) return;

  isResizing.value = false;
  document.removeEventListener("mousemove", onResizeMove);
  document.removeEventListener("mouseup", onResizeEnd);

  emit("resize", localWidth.value, localHeight.value);
}

// 드롭 타겟 하이라이트
const isDragOver = ref(false);

function onDragEnter(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = true;
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = false;
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = false;
}
</script>

<template>
  <div
    class="group-node"
    :class="{
      selected: isSelected,
      resizing: isResizing,
      'drag-over': isDragOver,
    }"
    :style="{
      borderColor: data?.color || '#475569',
      backgroundColor: isDragOver
        ? (data?.color || '#475569') + '40'
        : (data?.color || '#475569') + '15',
      width: localWidth + 'px',
      height: localHeight + 'px',
    }"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <div
      class="group-header"
      :style="{ backgroundColor: data?.color || '#475569' }"
    >
      <span class="group-icon">{{ data?.icon || "▤" }}</span>
      <span class="group-label">{{ data?.label }}</span>
    </div>

    <div class="group-content">
      <span class="drop-hint" v-if="isDragOver">Drop to add</span>
      <span class="group-hint" v-else-if="!data?.description"
        >Drop nodes here</span
      >
      <span class="group-desc" v-else>{{ data.description }}</span>
    </div>

    <div class="resize-handle" @mousedown.stop.prevent="onResizeStart"></div>
  </div>
</template>

<style scoped>
.group-node {
  border: 2px dashed;
  border-radius: 12px;
  position: relative;
  min-width: 150px;
  min-height: 100px;
  transition:
    border-color 0.15s,
    background-color 0.15s,
    box-shadow 0.15s;
  pointer-events: all;
}

.group-node.resizing {
  transition: none;
}

.group-node.selected {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
}

.group-node.drag-over {
  border-style: solid;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 10px 10px 0 0;
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  z-index: 1;
}

.group-icon {
  font-size: 11px;
}

.group-label {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.group-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 30px;
  pointer-events: none;
}

.group-hint {
  font-size: 11px;
  color: #64748b;
  font-style: italic;
}

.group-desc {
  font-size: 11px;
  color: #94a3b8;
}

.drop-hint {
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
}

.resize-handle {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  cursor: se-resize;
  z-index: 10;
}

.resize-handle::after {
  content: "";
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-right: 2px solid #475569;
  border-bottom: 2px solid #475569;
  opacity: 0;
  transition: opacity 0.15s;
}

.group-node:hover .resize-handle::after,
.group-node.selected .resize-handle::after {
  opacity: 1;
}

.resize-handle:hover::after {
  border-color: #6366f1;
}
</style>
