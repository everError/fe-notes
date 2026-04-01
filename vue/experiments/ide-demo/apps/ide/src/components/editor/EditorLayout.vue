<template>
  <div class="editor-layout">
    <!-- 좌측: 컴포넌트 팔레트 -->
    <ComponentPalette class="editor-layout__palette" />

    <!-- 중앙 -->
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
          <button
            :class="[
              'editor-toolbar__btn',
              isEditMode
                ? 'editor-toolbar__btn--edit-active'
                : 'editor-toolbar__btn--preview-active',
            ]"
            @click="toggleMode"
          >
            {{ isEditMode ? '✏️ 편집 모드' : '▶️ 미리보기' }}
          </button>
          <button
            class="editor-toolbar__btn editor-toolbar__btn--script"
            @click="showScriptDialog = true"
          >
            &lt;/&gt; 스크립트
          </button>
          <button class="editor-toolbar__btn" @click="handleCopy">
            {{ copyLabel }}
          </button>
          <button
            class="editor-toolbar__btn editor-toolbar__btn--primary"
            @click="handleSaveJSON"
          >
            JSON 저장
          </button>
          <label class="editor-toolbar__btn">
            JSON 불러오기
            <input type="file" accept=".json" hidden @change="handleLoadJSON" />
          </label>
        </div>
      </div>

      <!-- 에디터 모드: 캔버스 전체 -->
      <div v-show="activeTab === 'edit'" class="editor-layout__canvas-full">
        <Canvas ref="canvasRef" />
      </div>

      <!-- JSON 보기 -->
      <div v-show="activeTab === 'json'" class="editor-layout__fullpane">
        <pre class="code-preview">{{ store.toJSON() }}</pre>
      </div>

      <!-- .vue 코드 보기 -->
      <div v-show="activeTab === 'code'" class="editor-layout__fullpane">
        <pre class="code-preview">{{ generatedCode }}</pre>
      </div>
    </div>

    <!-- 우측: 속성 패널 -->
    <div class="editor-layout__right">
      <ComponentTree />
      <PropertyPanel class="editor-layout__props" />
    </div>

    <!-- 스크립트 다이얼로그 -->
    <Teleport to="body">
      <div
        v-if="showScriptDialog"
        class="script-dialog__backdrop"
        @click.self="showScriptDialog = false"
      >
        <div class="script-dialog">
          <div class="script-dialog__header">
            <span class="script-dialog__title"
              >&lt;script setup lang="ts"&gt;</span
            >
            <button
              class="script-dialog__close"
              @click="showScriptDialog = false"
            >
              ✕
            </button>
          </div>
          <div class="script-dialog__body">
            <ScriptEditor />
          </div>
          <div class="script-dialog__footer">
            <!-- 실행 결과 표시 -->
            <div class="script-dialog__status">
              <div
                v-if="store.scriptStatus"
                :class="[
                  'script-dialog__result',
                  store.scriptStatus.success
                    ? 'script-dialog__result--success'
                    : 'script-dialog__result--error',
                ]"
              >
                <span class="script-dialog__result-icon">
                  {{ store.scriptStatus.success ? '✅ ' : '❌ ' }}
                </span>
                <span class="script-dialog__result-message">
                  {{ store.scriptStatus.message }}
                </span>
              </div>
              <div
                v-if="
                  store.scriptStatus?.success &&
                  store.scriptStatus.bindingNames.length
                "
                class="script-dialog__bindings"
              >
                <span
                  v-for="name in store.scriptStatus.bindingNames"
                  :key="name"
                  class="badge badge--ref"
                >
                  {{ name }}
                </span>
              </div>
            </div>
            <div class="script-dialog__actions">
              <button class="script-dialog__apply" @click="applyScript">
                적용
              </button>
              <button
                class="script-dialog__done"
                @click="showScriptDialog = false"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 슬롯 선택 다이얼로그 -->
    <Teleport to="body">
      <div
        v-if="store.pendingSlotDrop"
        class="slot-dialog__backdrop"
        @click.self="store.cancelSlotDrop()"
      >
        <div class="slot-dialog">
          <div class="slot-dialog__header">
            <span class="slot-dialog__title">슬롯 선택</span>
            <span class="slot-dialog__sub">어느 영역에 배치할까요?</span>
          </div>
          <div class="slot-dialog__body">
            <button
              v-for="slot in store.pendingSlotDrop.slots"
              :key="slot.name"
              class="slot-dialog__option"
              @click="store.confirmSlotDrop(slot.name)"
            >
              <span class="slot-dialog__option-hash">#</span>
              <span class="slot-dialog__option-name">{{ slot.name }}</span>
              <span class="slot-dialog__option-label">{{ slot.label }}</span>
            </button>
          </div>
          <div class="slot-dialog__footer">
            <button class="slot-dialog__cancel" @click="store.cancelSlotDrop()">
              취소
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from 'vue';
import ComponentPalette from './ComponentPalette.vue';
import ScriptEditor from './ScriptEditor.vue';
import Canvas from './Canvas.vue';
import PropertyPanel from './PropertyPanel.vue';
import { useEditorStore } from '@/composables/useEditorStore';
import { generateVueCode, copyToClipboard } from '@/utils/code-generator';
import ComponentTree from './ComponentTree.vue';

const store = useEditorStore();

const activeTab = ref<'edit' | 'json' | 'code'>('edit');
const copyLabel = ref('코드 복사');
const showScriptDialog = ref(false);
const canvasRef = ref<InstanceType<typeof Canvas> | null>(null);

const generatedCode = computed(() => {
  return generateVueCode(store.tree, store.script);
});

function applyScript() {
  canvasRef.value?.applyScript();
}

async function handleCopy() {
  const text =
    activeTab.value === 'json' ? store.toJSON() : generatedCode.value;
  const ok = await copyToClipboard(text);
  if (ok) {
    copyLabel.value = '복사됨!';
    setTimeout(() => (copyLabel.value = '코드 복사'), 1500);
  }
}

function handleSaveJSON() {
  const blob = new Blob([store.toJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vue-ide-project.json';
  a.click();
  URL.revokeObjectURL(url);
}

function handleLoadJSON(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    store.loadFromJSON(reader.result as string);
  };
  reader.readAsText(file);
  input.value = '';
}
const isEditMode = ref(true);

function toggleMode() {
  isEditMode.value = !isEditMode.value;
  canvasRef.value?.setEditMode(isEditMode.value);
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

  &__canvas-full {
    flex: 1;
    overflow: hidden;
  }

  &__right {
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__props {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
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

    &--script {
      background: var(--ide-accent-purple);
      color: #fff;
      border-color: var(--ide-accent-purple);

      &:hover {
        opacity: 0.85;
      }
    }
    &--edit-active {
      background: var(--ide-primary);
      color: #fff;
      border-color: var(--ide-primary);
    }

    &--preview-active {
      background: var(--ide-accent-green);
      color: #fff;
      border-color: var(--ide-accent-green);
    }
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

// ── 스크립트 다이얼로그 ──
.script-dialog {
  &__backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  width: 70vw;
  max-width: 90vw;
  height: 80vh;
  max-height: 90vh;
  background: var(--ide-bg);
  border: 1px solid var(--ide-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--ide-surface);
    border-bottom: 1px solid var(--ide-border);
    flex-shrink: 0;
  }

  &__title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ide-accent-purple);
    font-family: var(--ide-font-mono);
  }

  &__close {
    padding: 4px 8px;
    font-size: 14px;
    color: var(--ide-text-dim);
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      color: var(--ide-text);
      background: var(--ide-surface-alt);
    }
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: var(--ide-surface);
    border-top: 1px solid var(--ide-border);
    flex-shrink: 0;
    gap: 8px;
  }

  &__vars {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    flex: 1;
    overflow: hidden;
  }

  &__actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  &__apply {
    padding: 6px 20px;
    font-size: 12px;
    font-weight: 700;
    background: var(--ide-accent-green);
    color: #fff;
    border: none;
    border-radius: 5px;
    cursor: pointer;

    &:hover {
      opacity: 0.85;
    }
  }

  &__done {
    padding: 6px 20px;
    font-size: 12px;
    font-weight: 700;
    background: var(--ide-surface-alt);
    color: var(--ide-text-muted);
    border: 1px solid var(--ide-border);
    border-radius: 5px;
    cursor: pointer;

    &:hover {
      color: var(--ide-text);
    }
  }
}

// ── 슬롯 선택 다이얼로그 ──
.slot-dialog {
  &__backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1001;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  width: 320px;
  background: var(--ide-bg);
  border: 1px solid var(--ide-border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);

  &__header {
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--ide-border);
  }

  &__title {
    font-size: 14px;
    font-weight: 700;
    color: var(--ide-text);
    display: block;
  }

  &__sub {
    font-size: 12px;
    color: var(--ide-text-dim);
    margin-top: 2px;
    display: block;
  }

  &__body {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: transparent;
    border: 1.5px solid var(--ide-border);
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.12s;
    text-align: left;

    &:hover {
      border-color: var(--ide-primary);
      background: var(--ide-primary-dim);
    }
  }

  &__option-hash {
    font-family: var(--ide-font-mono);
    font-size: 14px;
    font-weight: 700;
    color: var(--ide-primary);
  }

  &__option-name {
    font-family: var(--ide-font-mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--ide-text);
  }

  &__option-label {
    font-size: 11px;
    color: var(--ide-text-dim);
    margin-left: auto;
  }

  &__footer {
    padding: 8px 12px 12px;
    display: flex;
    justify-content: flex-end;
  }

  &__cancel {
    padding: 6px 16px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ide-text-dim);
    background: var(--ide-surface-alt);
    border: 1px solid var(--ide-border);
    border-radius: 5px;
    cursor: pointer;
    font-family: inherit;

    &:hover {
      color: var(--ide-text);
    }
  }
  &__status {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
  }

  &__result {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 4px;

    &--success {
      color: var(--ide-accent-green);
      background: rgba(34, 197, 94, 0.1);
    }

    &--error {
      color: var(--ide-accent-red);
      background: rgba(239, 68, 68, 0.1);
    }
  }

  &__result-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  &__result-message {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__bindings {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    padding: 0 4px;
  }
}
</style>
