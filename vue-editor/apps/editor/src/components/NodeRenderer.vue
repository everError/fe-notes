<template>
  <component
    v-if="isEditor && editorNode"
    :is="componentMap[editorNode.type]"
    v-bind="editorNode.props"
    :class="['rendered-node', { selected: isSelected }, editorNode.class]"
    :style="editorNode.style"
    @click.stop="selectNode(editorNode.id)"
  >
    <template
      v-for="(children, slotName) in editorNode.children"
      v-slot:[slotName]
    >
      <div
        class="slot drop-zone"
        :class="{ 'drag-over': isOverSlot === slotName }"
        @dragover.prevent="onDragOver(slotName)"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop(slotName, $event)"
      >
        <NodeRenderer v-for="child in children" :key="child.id" :node="child" />
      </div>
    </template>
  </component>

  <span
    v-else-if="isText && textNode"
    class="text-node"
    :class="{ selected: isSelected }"
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

const props = defineProps<{ node: Node }>();
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
const isOverSlot = ref<string | null>(null);
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
  outline: 2px solid #42b983;
  outline-offset: 2px;
}
.slot.drop-zone {
  padding: 0.5rem;
  border: 1px dashed #ccc;
  min-height: 24px;
  margin-bottom: 0.25rem;
}
.slot.drop-zone.drag-over {
  border: 2px solid #42b983;
  background: #e6f9f0;
}
</style>
