<template>
  <div class="editor-layout">
    <!-- 좌측: 컴포넌트 팔레트 -->
    <ComponentPalette class="editor-layout__palette" />

    <!-- 중앙: 스크립트 + 캔버스 -->
    <div class="editor-layout__center">
      <!-- 상단 툴바 -->
      <div class="editor-toolbar">
        <div class="editor-toolbar__tabs">
          <button
            :class="['editor-toolbar__tab', { active: activeTab === 'edit' }]"
            @click="activeTab = 'edit'"
          >
            에디터
          </button>
          <button
            :class="['editor-toolbar__tab', { active: activeTab === 'json' }]"
            @click="activeTab = 'json'"
          >
            JSON
          </button>
          <button
            :class="['editor-toolbar__tab', { active: activeTab === 'code' }]"
            @click="activeTab = 'code'"
          >
            .vue 코드
          </button>
        </div>
        <div class="editor-toolbar__actions">
          <button class="editor-toolbar__btn" @click="handleCopy">
            {{ copyLabel }}
          </button>
          <button class="editor-toolbar__btn editor-toolbar__btn--primary" @click="handleSaveJSON">
            JSON 저장
          </button>
          <label class="editor-toolbar__btn">
            JSON 불러오기
            <input type="file" accept=".json" hidden @change="handleLoadJSON" />
          </label>
        </div>
      </div>

      <!-- 에디터 모드 -->
      <div v-if="activeTab === 'edit'" class="editor-layout__split">
        <!-- 스크립트 에디터 -->
        <div class="editor-layout__script">
          <div class="pane-header">
            스크립트 &lt;script setup&gt;
          </div>
          <ScriptEditor class="editor-layout__script-editor" />
        </div>

        <!-- 리사이즈 핸들 -->
        <div
          class="editor-layout__resizer"
          @mousedown="startResize"
        />

        <!-- 캔버스 -->
        <div class="editor-layout__canvas">
          <div class="pane-header">
            캔버스
            <span class="pane-header__hint">컴포넌트를 드래그하여 배치</span>
          </div>
          <Canvas class="editor-layout__canvas-area" />
        </div>
      </div>

      <!-- JSON 보기 -->
      <div v-else-if="activeTab === 'json'" class="editor-layout__fullpane">
        <pre class="code-preview">{{ store.toJSON() }}</pre>
      </div>

      <!-- .vue 코드 보기 -->
      <div v-else class="editor-layout__fullpane">
        <pre class="code-preview">{{ generatedCode }}</pre>
      </div>
    </div>

    <!-- 우측: 속성 패널 -->
    <PropertyPanel class="editor-layout__props" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ComponentPalette from './ComponentPalette.vue'
import ScriptEditor from './ScriptEditor.vue'
import Canvas from './Canvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import { useEditorStore } from '@/composables/useEditorStore'
import { generateVueCode, copyToClipboard } from '@/utils/code-generator'

const store = useEditorStore()

const activeTab = ref<'edit' | 'json' | 'code'>('edit')
const copyLabel = ref('코드 복사')
const splitRatio = ref(0.4) // 스크립트:캔버스 비율

const generatedCode = computed(() => {
  return generateVueCode(store.tree, store.script)
})

// 코드 복사
async function handleCopy() {
  const text = activeTab.value === 'json' ? store.toJSON() : generatedCode.value
  const ok = await copyToClipboard(text)
  if (ok) {
    copyLabel.value = '복사됨!'
    setTimeout(() => (copyLabel.value = '코드 복사'), 1500)
  }
}

// JSON 저장
function handleSaveJSON() {
  const blob = new Blob([store.toJSON()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vue-ide-project.json'
  a.click()
  URL.revokeObjectURL(url)
}

// JSON 불러오기
function handleLoadJSON(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    store.loadFromJSON(reader.result as string)
  }
  reader.readAsText(file)
  input.value = ''
}

// 리사이즈 핸들
function startResize(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startRatio = splitRatio.value
  const container = (e.target as HTMLElement).parentElement!
  const totalWidth = container.clientWidth

  function onMove(ev: MouseEvent) {
    const dx = ev.clientX - startX
    splitRatio.value = Math.max(0.2, Math.min(0.7, startRatio + dx / totalWidth))
  }

  function onUp() {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
</script>

<style scoped lang="scss">
.editor-layout {
  display: flex;
  height: 100%;
  width: 100%;

  &__palette {
    width: 210px;
    flex-shrink: 0;
  }

  &__center {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-left: 1px solid var(--ide-border);
    border-right: 1px solid var(--ide-border);
  }

  &__split {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  &__script {
    flex: 0 0 v-bind('(splitRatio * 100) + "%"');
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__script-editor {
    flex: 1;
    min-height: 0;
  }

  &__resizer {
    width: 4px;
    cursor: col-resize;
    background: var(--ide-border);
    transition: background 0.15s;
    flex-shrink: 0;

    &:hover {
      background: var(--ide-primary);
    }
  }

  &__canvas {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__canvas-area {
    flex: 1;
    min-height: 0;
  }

  &__props {
    width: 280px;
    flex-shrink: 0;
  }

  &__fullpane {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }
}

.editor-toolbar {
  height: 42px;
  background: var(--ide-surface);
  border-bottom: 1px solid var(--ide-border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 6px;
  flex-shrink: 0;

  &__tabs {
    display: flex;
    gap: 2px;
  }

  &__tab {
    padding: 5px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--ide-text-dim);
    background: transparent;
    border: none;
    border-radius: 5px;
    transition: all 0.12s;
    font-family: inherit;

    &:hover {
      color: var(--ide-text-muted);
      background: var(--ide-surface-alt);
    }

    &.active {
      color: var(--ide-text);
      background: var(--ide-border);
    }
  }

  &__actions {
    margin-left: auto;
    display: flex;
    gap: 6px;
  }

  &__btn {
    padding: 5px 12px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    color: var(--ide-text-muted);
    background: var(--ide-surface-alt);
    border: 1px solid var(--ide-border);
    border-radius: 5px;
    font-family: inherit;
    transition: all 0.12s;

    &:hover {
      color: var(--ide-text);
      border-color: var(--ide-border-hover);
    }

    &--primary {
      background: var(--ide-primary);
      color: #fff;
      border-color: var(--ide-primary);

      &:hover {
        background: var(--ide-primary-hover);
      }
    }
  }
}

.pane-header {
  padding: 8px 14px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ide-primary);
  background: var(--ide-surface);
  border-bottom: 1px solid var(--ide-border);
  flex-shrink: 0;

  &__hint {
    font-weight: 400;
    color: var(--ide-text-dimmer);
    text-transform: none;
    letter-spacing: normal;
    margin-left: 8px;
  }
}

.code-preview {
  font-family: var(--ide-font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--ide-text);
  white-space: pre;
  tab-size: 2;
}
</style>
