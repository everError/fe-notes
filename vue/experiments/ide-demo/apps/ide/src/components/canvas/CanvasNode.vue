<template>
  <div
    :class="[
      'canvas-node',
      {
        'canvas-node--selected': isSelected,
        'canvas-node--container': meta?.canHaveChildren,
        'canvas-node--dragging': isDraggingSelf,
      },
    ]"
    :style="{ marginLeft: depth > 0 ? '0' : undefined }"
    @click.stop="emit('select', node.id)"
  >
    <!-- 노드 헤더 (타입 라벨 + 드래그 핸들) -->
    <div
      class="canvas-node__header"
      draggable="true"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
    >
      <span class="canvas-node__drag-handle">⠿</span>
      <span class="canvas-node__type">{{ node.type }}</span>
      <span v-if="node.props.label" class="canvas-node__label">{{
        node.props.label
      }}</span>
      <button
        v-if="isSelected"
        class="canvas-node__delete"
        title="삭제"
        @click.stop="store.removeNode(node.id)"
      >
        ✕
      </button>
    </div>

    <!-- 컴포넌트 프리뷰 (간이 렌더링) -->
    <div class="canvas-node__preview">
      <ComponentPreview :node="node" />
    </div>

    <!-- 슬롯 드롭존 (컨테이너 컴포넌트) -->
    <template v-if="meta?.canHaveChildren && meta.slots.length > 0">
      <div
        v-for="slotDef in meta.slots"
        :key="slotDef.name"
        :class="[
          'canvas-node__slot',
          { 'canvas-node__slot--dragover': slotDragover === slotDef.name },
        ]"
        @dragover.prevent.stop="onSlotDragOver(slotDef.name, $event)"
        @dragleave="onSlotDragLeave(slotDef.name)"
        @drop.prevent.stop="onSlotDrop(slotDef.name)"
      >
        <div class="canvas-node__slot-label">
          #{{ slotDef.name }}
          <span class="canvas-node__slot-desc">{{ slotDef.label }}</span>
        </div>

        <!-- 슬롯 내 자식 노드 -->
        <template v-if="node.slots[slotDef.name]?.length">
          <CanvasNode
            v-for="child in node.slots[slotDef.name]"
            :key="child.id"
            :node="child"
            :depth="depth + 1"
            @select="emit('select', $event)"
          />
        </template>
        <div v-else class="canvas-node__slot-empty">드롭하여 추가</div>
      </div>
    </template>

    <!-- children 드롭존 (슬롯 없는 컨테이너) -->
    <div
      v-if="meta?.canHaveChildren && meta.slots.length === 0"
      :class="[
        'canvas-node__children',
        { 'canvas-node__children--dragover': childrenDragover },
      ]"
      @dragover.prevent.stop="onChildrenDragOver"
      @dragleave="childrenDragover = false"
      @drop.prevent.stop="onChildrenDrop"
    >
      <template v-if="node.children.length">
        <CanvasNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
          @select="emit('select', $event)"
        />
      </template>
      <div v-else class="canvas-node__children-empty">
        자식 컴포넌트를 드롭하세요
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { EditorNode } from '@ide-demo/editor';
import { componentRegistry } from '@ide-demo/editor';
import { useEditorStore } from '@/composables/useEditorStore';
import ComponentPreview from '@/components/canvas/ComponentPreview.vue';

const props = defineProps<{
  node: EditorNode;
  depth: number;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

const store = useEditorStore();
const isDraggingSelf = ref(false);
const slotDragover = ref<string | null>(null);
const childrenDragover = ref(false);

const meta = computed(() => componentRegistry[props.node.type]);
const isSelected = computed(() => store.selectedId === props.node.id);

// ─── 드래그 (이 노드를 이동) ───
function onDragStart(e: DragEvent) {
  e.stopPropagation();
  e.dataTransfer!.setData('text/plain', props.node.id);
  e.dataTransfer!.effectAllowed = 'move';
  isDraggingSelf.value = true;
  store.startDrag({ source: 'canvas', id: props.node.id });
}

function onDragEnd() {
  isDraggingSelf.value = false;
  store.endDrag();
}

// ─── 슬롯 드롭 ───
function onSlotDragOver(slotName: string, e: DragEvent) {
  if (!store.isDragging) return;
  // 자기 자신 안으로 드롭 방지
  if (
    store.dragItem?.source === 'canvas' &&
    store.dragItem.id === props.node.id
  )
    return;
  e.dataTransfer!.dropEffect =
    store.dragItem?.source === 'palette' ? 'copy' : 'move';
  slotDragover.value = slotName;
}

function onSlotDragLeave(slotName: string) {
  if (slotDragover.value === slotName) {
    slotDragover.value = null;
  }
}

function onSlotDrop(slotName: string) {
  if (!store.dragItem) return;
  store.executeDrop({
    parentId: props.node.id,
    slotName,
    index: props.node.slots[slotName]?.length ?? 0,
  });
  slotDragover.value = null;
}

// ─── Children 드롭 ───
function onChildrenDragOver(e: DragEvent) {
  if (!store.isDragging) return;
  if (
    store.dragItem?.source === 'canvas' &&
    store.dragItem.id === props.node.id
  )
    return;
  e.dataTransfer!.dropEffect =
    store.dragItem?.source === 'palette' ? 'copy' : 'move';
  childrenDragover.value = true;
}

function onChildrenDrop() {
  if (!store.dragItem) return;
  store.executeDrop({
    parentId: props.node.id,
    index: props.node.children.length,
  });
  childrenDragover.value = false;
}
</script>

<style scoped lang="scss">
.canvas-node {
  position: relative;
  margin: 6px 0;
  border: 1.5px solid transparent;
  border-radius: var(--ide-radius);
  transition:
    border-color 0.12s,
    box-shadow 0.12s;
  background: var(--ide-surface);

  &:hover {
    border-color: var(--ide-border-hover);
  }

  &--selected {
    border-color: var(--ide-primary) !important;
    box-shadow:
      0 0 0 1px var(--ide-primary),
      0 0 12px rgba(99, 102, 241, 0.15);
  }

  &--dragging {
    opacity: 0.4;
  }

  // ─── Header ───
  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--ide-surface-alt);
    border-radius: var(--ide-radius) var(--ide-radius) 0 0;
    cursor: grab;
    user-select: none;

    &:active {
      cursor: grabbing;
    }
  }

  &__drag-handle {
    font-size: 11px;
    color: var(--ide-text-dimmer);
    letter-spacing: 1px;
  }

  &__type {
    font-size: 11px;
    font-weight: 700;
    color: var(--ide-primary-hover);
    font-family: var(--ide-font-mono);
  }

  &__label {
    font-size: 11px;
    color: var(--ide-text-dim);
    margin-left: 2px;

    &::before {
      content: '— ';
      color: var(--ide-text-dimmer);
    }
  }

  &__delete {
    margin-left: auto;
    padding: 0 4px;
    font-size: 12px;
    color: var(--ide-text-dimmer);
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 3px;
    line-height: 1;

    &:hover {
      color: var(--ide-accent-red);
      background: rgba(239, 68, 68, 0.1);
    }
  }

  // ─── Preview ───
  &__preview {
    padding: 8px 10px;
    pointer-events: none;
  }

  // ─── Slot drop zones ───
  &__slot {
    margin: 4px 8px 8px;
    padding: 8px;
    border: 1.5px dashed var(--ide-border);
    border-radius: var(--ide-radius);
    min-height: 40px;
    transition: all 0.15s;

    &--dragover {
      border-color: var(--ide-primary);
      background: var(--ide-primary-dim);
    }
  }

  &__slot-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--ide-text-dimmer);
    margin-bottom: 6px;
    font-family: var(--ide-font-mono);
  }

  &__slot-desc {
    font-weight: 400;
    color: var(--ide-text-dimmer);
    font-family: var(--ide-font-sans);
    margin-left: 4px;
    opacity: 0.7;
  }

  &__slot-empty {
    font-size: 11px;
    color: var(--ide-text-dimmer);
    text-align: center;
    padding: 8px;
    opacity: 0.6;
  }

  // ─── Children drop zone ───
  &__children {
    margin: 4px 8px 8px;
    padding: 8px;
    border: 1.5px dashed var(--ide-border);
    border-radius: var(--ide-radius);
    min-height: 40px;
    transition: all 0.15s;

    &--dragover {
      border-color: var(--ide-primary);
      background: var(--ide-primary-dim);
    }
  }

  &__children-empty {
    font-size: 11px;
    color: var(--ide-text-dimmer);
    text-align: center;
    padding: 8px;
    opacity: 0.6;
  }
}
</style>
