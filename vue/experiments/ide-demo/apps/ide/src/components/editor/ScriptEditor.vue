<template>
  <div class="script-editor">
    <!-- 좌측: 스니펫 목록 -->
    <div class="script-editor__snippets">
      <div class="script-editor__snippets-title">코드 스니펫</div>
      <div
        v-for="group in snippetGroups"
        :key="group.category"
        class="script-editor__snippet-group"
      >
        <div class="script-editor__snippet-cat">{{ group.category }}</div>
        <div
          v-for="snippet in group.items"
          :key="snippet.name"
          class="script-editor__snippet-item"
          @click="insertSnippet(snippet.code)"
        >
          <div class="script-editor__snippet-name">{{ snippet.name }}</div>
          <div class="script-editor__snippet-desc">
            {{ snippet.description }}
          </div>
        </div>
      </div>
    </div>

    <!-- 우측: Monaco 에디터 -->
    <div ref="editorContainer" class="script-editor__monaco" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as monaco from 'monaco-editor';
import { useEditorStore } from '@/composables/useEditorStore';

const store = useEditorStore();
const editorContainer = ref<HTMLElement>();
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const snippetGroups = [
  {
    category: '상태',
    items: [
      {
        name: 'ref 변수',
        description: '반응형 변수 선언',
        code: `const myVar = ref('');\n`,
      },
      {
        name: 'reactive 객체',
        description: '반응형 객체 선언',
        code: `const form = reactive({\n  field1: '',\n  field2: '',\n});\n`,
      },
      {
        name: 'computed',
        description: '계산된 속성',
        code: `const myComputed = computed(() => {\n  return '';\n});\n`,
      },
    ],
  },
  {
    category: 'API',
    items: [
      {
        name: 'defineApi',
        description: 'API 정의 + 호출',
        code: `const useMyApi = defineApi((api) => ({\n  list: api.get('/api/path'),\n  save: api.put('/api/path'),\n}));\n\nconst { list, save } = useMyApi();\n`,
      },
      {
        name: 'fetch 호출',
        description: '조회 함수',
        code: `const search = async () => {\n  await list.fetch();\n};\n`,
      },
    ],
  },
  {
    category: '선택/편집',
    items: [
      {
        name: 'useSelection',
        description: '행 선택 + CRUD',
        code: `const selection = useSelection<MyType>();\n`,
      },
      {
        name: '행 선택 핸들러',
        description: 'onRowSelected',
        code: `const onRowSelected = async (params: any) => {\n  const proceed = await selection.guard();\n  if (!proceed) return;\n  selection.select(params.data);\n};\n`,
      },
      {
        name: '신규 생성',
        description: 'create 호출',
        code: `const onNew = async () => {\n  const proceed = await selection.guard();\n  if (!proceed) return;\n  selection.create({\n    field1: '',\n    field2: '',\n  });\n};\n`,
      },
      {
        name: '저장',
        description: 'save + commit',
        code: `const onSave = async () => {\n  const result = await save(selection.data.value);\n  if (result.success) {\n    selection.commit();\n    await list.refetch();\n  }\n};\n`,
      },
    ],
  },
  {
    category: '그리드',
    items: [
      {
        name: '컬럼 정의',
        description: 'colDefs 배열',
        code: `const colDefs = [\n  { field: 'code', headerName: '코드' },\n  { field: 'name', headerName: '이름' },\n  { field: 'remarks', headerName: '비고', flex: 1 },\n];\n`,
      },
      {
        name: 'gridRef',
        description: '그리드 참조',
        code: `const gridRef = ref<InstanceType<typeof ADataGrid> | null>(null);\n`,
      },
    ],
  },
  {
    category: '유틸',
    items: [
      {
        name: 'submitted 상태',
        description: '유효성 검사용',
        code: `const submitted = ref(false);\n`,
      },
      {
        name: 'loading 상태',
        description: '로딩 표시용',
        code: `const loading = ref(false);\n`,
      },
      {
        name: 'import 기본',
        description: 'Vue + 라이브러리 import',
        code: `import { ref, reactive, computed } from 'vue';\nimport {\n  defineApi,\n  useSelection,\n} from '@ide-demo/shared';\n`,
      },
    ],
  },
];

function insertSnippet(code: string) {
  if (!editor) return;
  const position = editor.getPosition();
  if (!position) return;

  // 현재 커서 위치에 삽입
  editor.executeEdits('snippet', [
    {
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column,
      ),
      text: code,
    },
  ]);

  // 삽입 후 커서를 끝으로 이동
  const lines = code.split('\n');
  const newLine = position.lineNumber + lines.length - 1;
  const newCol =
    lines.length === 1
      ? position.column + code.length
      : lines[lines.length - 1].length + 1;
  editor.setPosition({ lineNumber: newLine, column: newCol });
  editor.focus();
}

onMounted(() => {
  if (!editorContainer.value) return;

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

  editor.onDidChangeModelContent(() => {
    const value = editor!.getValue();
    if (value !== store.script) {
      store.script = value;
    }
  });
});

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
  display: flex;
  overflow: hidden;

  &__snippets {
    width: 200px;
    flex-shrink: 0;
    background: var(--ide-surface);
    border-right: 1px solid var(--ide-border);
    overflow-y: auto;
    padding-bottom: 12px;
  }

  &__snippets-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ide-primary);
    padding: 12px 12px 8px;
  }

  &__snippet-group {
    margin-bottom: 4px;
  }

  &__snippet-cat {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ide-text-dimmer);
    padding: 8px 12px 4px;
  }

  &__snippet-item {
    padding: 6px 12px;
    cursor: pointer;
    transition: background 0.1s;
    border-radius: 3px;
    margin: 1px 4px;

    &:hover {
      background: var(--ide-surface-alt);
    }
  }

  &__snippet-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--ide-text);
    font-family: var(--ide-font-mono);
  }

  &__snippet-desc {
    font-size: 10px;
    color: var(--ide-text-dim);
    margin-top: 1px;
  }

  &__monaco {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
}
</style>
