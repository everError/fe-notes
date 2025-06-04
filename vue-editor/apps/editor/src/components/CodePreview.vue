// apps/editor/src/components/CodePreview.vue
<template>
  <div class="code-preview">
    <div class="preview-header">
      <h3>📝 코드 미리보기</h3>
      <button @click="exportEditorState">저장</button>
      <input type="file" accept="application/json" @change="onFileChange" />
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

// 저장하기 (예: 버튼 클릭 시)
function exportEditorState() {
  const json = JSON.stringify(store.rootNodes, null, 2);
  // 클립보드 복사
  navigator.clipboard.writeText(json);
  // 또는 파일로 저장 (아래 예시)
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "editor-state.json";
  a.click();
  URL.revokeObjectURL(url);
}
// 불러오기 (예: 파일 선택, 또는 textarea에 붙여넣기 등)
function importEditorState(json: string) {
  try {
    const nodes = JSON.parse(json);
    // 간단하게는 바로 대입
    store.rootNodes = nodes;
    // 만약 ref(rootNodes.value)라면 store.rootNodes.value = nodes;
  } catch (e) {
    alert("불러오기 실패: 올바른 JSON이 아닙니다.");
  }
}
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      importEditorState(reader.result);
    }
  };
  reader.readAsText(file);
}

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
