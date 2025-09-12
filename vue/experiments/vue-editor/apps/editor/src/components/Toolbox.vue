// apps/editor/src/components/Toolbox.vue
<template>
  <div class="toolbox">
    <h3>🧰 Toolbox</h3>
    <div
      v-for="component in components"
      :key="component.name"
      class="toolbox-item"
      draggable="true"
      @dragstart="(e) => onDragStart(component.name, e)"
    >
      {{ component.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { getAllComponentMeta } from "@vue-editor/schema";

const components = getAllComponentMeta();
function onDragStart(type: string, event: DragEvent) {
  event.dataTransfer?.setData("component-type", type);
  event.dataTransfer!.effectAllowed = "copy";
}
</script>

<style scoped>
.toolbox {
  padding: 1rem;
  background: #f9f9f9;
  border-right: 1px solid #ddd;
}
.toolbox-item {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: white;
  border: 1px solid #ccc;
  cursor: grab;
  user-select: none;
}
.toolbox-item:active {
  cursor: grabbing;
}
</style>
