// apps/editor/src/components/CodePreview.vue
<template>
  <div class="code-preview">
    <div class="preview-header">
      <h3>📝 코드 미리보기</h3>
      <button @click="copyCode">복사</button>
    </div>
    <pre><code>{{ code }}</code></pre>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from "../store/editorStore";
import { generateVueCode } from "@vue-editor/core";
import { computed } from "vue";

const store = useEditorStore();
const code = computed(() => generateVueCode(store.rootNodes));

function copyCode() {
  navigator.clipboard.writeText(code.value).then(() => {
    alert("코드가 복사되었습니다.");
  });
}
</script>

<style scoped>
.code-preview {
  border-top: 1px solid #ccc;
  padding: 1rem;
  background: #f5f5f5;
  font-family: monospace;
  white-space: pre-wrap;
}
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
pre {
  background: #fff;
  padding: 1rem;
  border: 1px solid #ddd;
  max-height: 300px;
  overflow: auto;
}
button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-size: 0.9rem;
  border-radius: 4px;
}
button:hover {
  background-color: #0056b3;
}
</style>
