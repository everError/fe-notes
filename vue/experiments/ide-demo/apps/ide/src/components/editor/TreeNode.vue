<template>
  <div class="tree-node">
    <!-- before 인디케이터 -->
    <div
      v-if="isDragOver && dragPosition === 'before'"
      class="tree-node__drop-indicator tree-node__drop-indicator--before"
    />

    <!-- 노드 행 -->
    <div
      :class="[
        'tree-node__row',
        { 'tree-node__row--selected': isSelected },
        {
          'tree-node__row--drop-inside':
            isDragOver && dragPosition === 'inside',
        },
      ]"
      :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
      draggable="true"
      @click.stop="store.selectNode(node.id)"
      @dragstart.stop="onDragStart"
      @dragend="onDragEnd"
      @dragover.prevent.stop="onDragOver"
      @dragleave="
        isDragOver = false;
        dragPosition = null;
      "
      @drop.prevent.stop="onDrop"
    >
      <!-- 토글 -->
      <span
        v-if="hasChildren"
        class="tree-node__toggle"
        @click.stop="expanded = !expanded"
      >
        {{ expanded ? '▼' : '▶' }}
      </span>
      <span v-else class="tree-node__toggle-placeholder" />

      <!-- 아이콘 + 타입 -->
      <span class="tree-node__icon">{{ meta?.icon ?? '?' }}</span>
      <span class="tree-node__type">{{ node.type }}</span>

      <!-- 라벨 (있으면) -->
      <span v-if="node.props.label" class="tree-node__label">
        {{ node.props.label }}
      </span>

      <!-- 삭제 -->
      <button
        v-if="isSelected"
        class="tree-node__delete"
        @click.stop="store.removeNode(node.id)"
      >
        ✕
      </button>
    </div>

    <!-- 드래그 오버 인디케이터 -->
    <!-- <div v-if="isDragOver" class="tree-node__drop-indicator" /> -->

    <!-- 자식 (expanded) -->
    <template v-if="expanded && hasChildren">
      <!-- 슬롯 자식 -->
      <template v-for="(slotNodes, slotName) in node.slots" :key="slotName">
        <div
          v-if="slotNodes.length || true"
          class="tree-node__slot-label"
          :style="{ paddingLeft: (depth + 1) * 16 + 8 + 'px' }"
          @dragover.prevent.stop="onSlotDragOver(slotName as string, $event)"
          @dragleave="slotDragOver = null"
          @drop.prevent.stop="onSlotDrop(slotName as string)"
        >
          <span
            :class="{
              'tree-node__slot-label--dragover': slotDragOver === slotName,
            }"
          >
            #{{ slotName }}
          </span>
        </div>
        <TreeNode
          v-for="child in slotNodes"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
        />
      </template>

      <!-- 일반 자식 -->
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
      />
    </template>
  </div>
  <!-- after 인디케이터 -->
  <div
    v-if="isDragOver && dragPosition === 'after'"
    class="tree-node__drop-indicator tree-node__drop-indicator--after"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { EditorNode } from '@ide-demo/editor';
import { componentRegistry } from '@ide-demo/editor';
import { useEditorStore } from '@/composables/useEditorStore';

const props = defineProps<{
  node: EditorNode;
  depth: number;
}>();

const store = useEditorStore();

const expanded = ref(true);
const isDragOver = ref(false);
const slotDragOver = ref<string | null>(null);

const meta = computed(() => componentRegistry[props.node.type] ?? null);
const isSelected = computed(() => store.selectedId === props.node.id);

const hasChildren = computed(() => {
  const hasSlotChildren = Object.values(props.node.slots || {}).some(
    (s) => s.length > 0,
  );
  const hasDirectChildren = (props.node.children?.length ?? 0) > 0;
  const hasSlotDefs = (meta.value?.slots?.length ?? 0) > 0;
  return (
    hasSlotChildren ||
    hasDirectChildren ||
    hasSlotDefs ||
    meta.value?.canHaveChildren
  );
});

// ── 드래그: 이 노드를 이동 ──

function onDragStart(e: DragEvent) {
  e.dataTransfer!.setData('text/plain', props.node.id);
  e.dataTransfer!.effectAllowed = 'move';
  store.startDrag({ source: 'canvas', id: props.node.id });
}

function onDragEnd() {
  store.endDrag();
}

// ── 드롭: 이 노드 위에 드롭 ──

const dragPosition = ref<'before' | 'after' | 'inside' | null>(null);

function onDragOver(e: DragEvent) {
  if (!store.isDragging) return;
  if (
    store.dragItem?.source === 'canvas' &&
    store.dragItem.id === props.node.id
  )
    return;
  e.dataTransfer!.dropEffect =
    store.dragItem?.source === 'palette' ? 'copy' : 'move';

  // 마우스 Y 위치로 before/after/inside 판단
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const y = e.clientY - rect.top;
  const height = rect.height;

  if (meta.value?.canHaveChildren) {
    // 컨테이너: 상단 25% = before, 하단 25% = after, 가운데 = inside
    if (y < height * 0.25) {
      dragPosition.value = 'before';
    } else if (y > height * 0.75) {
      dragPosition.value = 'after';
    } else {
      dragPosition.value = 'inside';
    }
  } else {
    // 비컨테이너: 상단 50% = before, 하단 50% = after
    dragPosition.value = y < height / 2 ? 'before' : 'after';
  }

  isDragOver.value = true;
}

function onDrop() {
  if (!store.dragItem) return;

  const position = dragPosition.value;
  isDragOver.value = false;
  dragPosition.value = null;

  if (position === 'inside') {
    // 컨테이너 내부에 넣기
    if (meta.value?.slots?.length) {
      store.executeDrop({
        parentId: props.node.id,
        index: 0,
      });
    } else {
      store.executeDrop({
        parentId: props.node.id,
        index: props.node.children?.length ?? 0,
      });
    }
  } else {
    // before/after: 같은 부모의 형제로 삽입
    const parentId = props.node.parentId ?? 'root';
    const parent =
      parentId === 'root' ? null : store.findNodeById(store.tree, parentId);

    let siblingIndex = 0;
    if (parentId === 'root') {
      siblingIndex = store.tree.findIndex((n) => n.id === props.node.id);
    } else if (props.node.parentSlot && parent) {
      siblingIndex = (parent.slots[props.node.parentSlot] ?? []).findIndex(
        (n) => n.id === props.node.id,
      );
    } else if (parent) {
      siblingIndex = parent.children.findIndex((n) => n.id === props.node.id);
    }

    const index = position === 'before' ? siblingIndex : siblingIndex + 1;

    store.executeDrop({
      parentId,
      slotName: props.node.parentSlot ?? undefined,
      index,
    });
  }
}

// ── 슬롯에 직접 드롭 ──

function onSlotDragOver(slotName: string, e: DragEvent) {
  if (!store.isDragging) return;
  e.dataTransfer!.dropEffect =
    store.dragItem?.source === 'palette' ? 'copy' : 'move';
  slotDragOver.value = slotName;
}

function onSlotDrop(slotName: string) {
  if (!store.dragItem) return;
  slotDragOver.value = null;

  store.executeDrop({
    parentId: props.node.id,
    slotName,
    index: props.node.slots[slotName]?.length ?? 0,
  });
}
</script>

<style scoped lang="scss">
.tree-node {
  &__row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    cursor: pointer;
    border-radius: 3px;
    font-size: 12px;
    transition: background 0.1s;
    user-select: none;

    &:hover {
      background: var(--ide-surface-alt);
    }

    &--selected {
      background: var(--ide-primary-dim) !important;
    }
  }

  &__toggle {
    font-size: 8px;
    width: 14px;
    text-align: center;
    color: var(--ide-text-dim);
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      color: var(--ide-text);
    }
  }

  &__toggle-placeholder {
    width: 14px;
    flex-shrink: 0;
  }

  &__icon {
    font-size: 12px;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
  }

  &__type {
    font-family: var(--ide-font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--ide-text);
  }

  &__label {
    font-size: 10px;
    color: var(--ide-text-dim);
    margin-left: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &::before {
      content: '— ';
      color: var(--ide-text-dimmer);
    }
  }

  &__delete {
    margin-left: auto;
    padding: 0 3px;
    font-size: 10px;
    color: var(--ide-text-dimmer);
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 2px;
    line-height: 1;
    flex-shrink: 0;

    &:hover {
      color: var(--ide-accent-red);
      background: rgba(239, 68, 68, 0.1);
    }
  }

  &__drop-indicator {
    height: 2px;
    background: var(--ide-primary);
    margin: 0 8px;
    border-radius: 1px;
  }

  &__slot-label {
    font-size: 10px;
    font-family: var(--ide-font-mono);
    color: var(--ide-text-dimmer);
    padding: 2px 8px;
    cursor: default;

    span {
      padding: 1px 6px;
      border-radius: 3px;
      transition: all 0.12s;
    }

    &--dragover {
      background: var(--ide-primary-dim);
      color: var(--ide-primary);
    }
  }
  &__drop-indicator {
    height: 2px;
    background: #22d3ee;
    margin: 0 8px;
    border-radius: 1px;

    &--before {
      margin-bottom: -1px;
    }

    &--after {
      margin-top: -1px;
    }
  }

  &__row--drop-inside {
    background: rgba(34, 211, 238, 0.1) !important;
    box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.4);
    border-radius: 3px;
  }
}
</style>
