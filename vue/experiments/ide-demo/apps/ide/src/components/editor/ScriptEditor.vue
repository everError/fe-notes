<template>
  <div ref="editorContainer" class="script-editor" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as monaco from 'monaco-editor';
import { useEditorStore } from '@/composables/useEditorStore';

const store = useEditorStore();
const editorContainer = ref<HTMLElement>();
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

onMounted(() => {
  if (!editorContainer.value) return;

  // Monaco 에디터 테마 설정
  monaco.editor.defineTheme('ide-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c084fc' },
      { token: 'string', foreground: '86efac' },
      { token: 'number', foreground: 'fbbf24' },
      { token: 'type', foreground: '67e8f9' },
    ],
    colors: {
      'editor.background': '#0f1117',
      'editor.foreground': '#e2e8f0',
      'editor.lineHighlightBackground': '#1a1d2440',
      'editor.selectionBackground': '#6366f140',
      'editorCursor.foreground': '#6366f1',
      'editorLineNumber.foreground': '#3a3f4b',
      'editorLineNumber.activeForeground': '#6b7280',
    },
  });

  editor = monaco.editor.create(editorContainer.value, {
    value: store.script,
    language: 'typescript',
    theme: 'ide-dark',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on',
    padding: { top: 12 },
    renderLineHighlight: 'gutter',
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
  });

  // 에디터 내용 변경 → store 업데이트
  editor.onDidChangeModelContent(() => {
    const value = editor!.getValue();
    if (value !== store.script) {
      store.script = value;
    }
  });
});

// 외부에서 script가 변경되면 에디터에 반영 (JSON 불러오기 등)
watch(
  () => store.script,
  (newVal) => {
    if (editor && editor.getValue() !== newVal) {
      editor.setValue(newVal);
    }
  },
);

onBeforeUnmount(() => {
  editor?.dispose();
});
</script>

<style scoped lang="scss">
.script-editor {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
