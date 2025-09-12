<template>
  <div class="editor-layout">
    <Toolbox class="left" />
    <Canvas class="center" />
    <Inspector class="right" />
    <CodePreview class="bottom" />
  </div>
</template>

<script setup lang="ts">
import Toolbox from "./components/Toolbox.vue";
import Canvas from "./components/Canvas.vue";
import Inspector from "./components/Inspector.vue";
import CodePreview from "./components/CodePreview.vue";
</script>

<style scoped>
.editor-layout {
  display: grid;
  grid-template-columns: 200px 1fr 300px;
  grid-template-rows: 1fr auto;
  grid-template-areas:
    "left center right"
    "bottom bottom bottom";
  height: 100vh;
}
.left {
  grid-area: left;
  border-right: 1px solid #ddd;
}
.center {
  grid-area: center;
}
.right {
  grid-area: right;
  border-left: 1px solid #ddd;
}
.bottom {
  grid-area: bottom;
  height: 250px;
  overflow: auto;
}
</style>
