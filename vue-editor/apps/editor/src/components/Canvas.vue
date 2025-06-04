// apps/editor/src/components/Canvas.vue
<template>
  <div class="canvas" @dragover.prevent @drop.prevent="onDrop">
    <NodeRenderer v-for="node in store.rootNodes" :key="node.id" :node="node" />
    <div v-if="store.rootNodes.length === 0" class="canvas-placeholder">
      여기에 컴포넌트를 드래그하세요
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from "../store/editorStore";
import { createNode } from "@vue-editor/core";
import NodeRenderer from "./NodeRenderer.vue";

const store = useEditorStore();

function onDrop(event: DragEvent) {
  const type = event.dataTransfer?.getData("component-type");
  if (!type) return;
  // 이미 자식 노드가 있는 경우 무시 (슬롯 내부에서 처리하므로)
  const node = createNode(type);
  store.addNode(null, "default", node);
}
</script>

<style scoped>
.canvas {
  flex: 1;
  padding: 1rem;
  background-color: #fff;
  min-height: 100vh;
  position: relative;
}
.canvas-placeholder {
  color: #aaa;
  text-align: center;
  margin-top: 3rem;
}
</style>
