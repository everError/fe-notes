<template>
  <!-- 컴포넌트 노드 -->
  <component
    v-if="isEditor && editorNode"
    :is="componentMap[editorNode.type]"
    v-bind="editorNode.props"
    :class="['rendered-node', { selected: isSelected }, editorNode.class]"
    :style="editorNode.style"
    @click.stop="selectNode(editorNode.id)"
  >
    <!-- 여러 슬롯 지원: 각 slotName 별로 처리 -->
    <template
      v-for="(children, slotName) in editorNode.children"
      v-slot:[slotName]
    >
      <!-- slot에 자식이 있을 때: div 없이 직접 NodeRenderer만 -->
      <template v-if="children.length > 0">
        <NodeRenderer
          v-for="child in children"
          :key="child.id"
          :node="child"
          :draggingOver="isOverSlot === slotName"
        />
      </template>
      <!-- slot에 자식이 없을 때만 drop-zone div (구조상 문제 없음) -->
      <template v-else>
        <div
          class="slot drop-zone"
          :class="{ 'drag-over': isOverSlot === slotName }"
          @dragover.prevent="onDragOver(slotName)"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop(slotName, $event)"
        >
          <span class="placeholder text-xs text-gray-400">여기에 드롭!</span>
        </div>
      </template>
    </template>
  </component>

  <!-- 텍스트 노드 -->
  <span
    v-else-if="isText && textNode"
    class="text-node"
    :class="{ selected: isSelected, 'drag-over': draggingOver }"
    @click.stop="selectNode(textNode.id)"
  >
    {{ textNode.content }}
  </span>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Node, TextNode, EditorNode } from "@vue-editor/core";
import { isTextNode, isEditorNode } from "@vue-editor/core";
import { useEditorStore } from "../store/editorStore";
import NodeRenderer from "./NodeRenderer.vue";
import { createNode } from "@vue-editor/core";
import { componentMap } from "@vue-editor/schema";

// props
const props = defineProps<{
  node: Node;
  draggingOver?: boolean;
}>();

const store = useEditorStore();

const isText = computed(() => isTextNode(props.node));
const isEditor = computed(() => isEditorNode(props.node));

const textNode = computed(() =>
  isText.value ? (props.node as TextNode) : null
);
const editorNode = computed(() =>
  isEditor.value ? (props.node as EditorNode) : null
);

const isSelected = computed(() => store.selectedNodeId === props.node.id);

// 드래그 오버 상태 (slotName 저장)
const isOverSlot = ref<string | null>(null);

// 이벤트 핸들러
function selectNode(id: string) {
  store.selectNode(id);
}
function onDragOver(slotName: string) {
  isOverSlot.value = slotName;
}
function onDragLeave() {
  isOverSlot.value = null;
}
function onDrop(slotName: string, event: DragEvent) {
  isOverSlot.value = null;
  event.preventDefault();
  event.stopPropagation();

  const type = event.dataTransfer?.getData("component-type");
  if (!type || !editorNode.value) return;
  const newNode = createNode(type);
  store.addNode(editorNode.value.id, slotName, newNode);
}
</script>

<style scoped>
.rendered-node.selected,
.text-node.selected {
  outline: 2px solid #4262b9;
  outline-offset: 2px;
}
/* 드래그 오버: 자식 노드에 주는 효과 */
.rendered-node.drag-over,
.text-node.drag-over {
  outline: 2px dashed #42b983;
  background: #e6f9f0;
}
/* 드랍존(플레이스홀더) - 자식 없을 때만 */
.slot.drop-zone {
  border: 2px dashed #bbb;
  min-height: 40px;
  padding: 10px;
  margin-bottom: 8px;
  background: #f8fafb;
  position: relative;
  transition: border-color 0.15s, background 0.15s;
  display: block;
}
.slot.drop-zone.drag-over {
  border-color: #42b983;
  background: #e6f9f0;
}
.placeholder {
  display: block;
  text-align: center;
  margin: 8px 0;
  color: #aaa;
  pointer-events: none;
}
</style>
