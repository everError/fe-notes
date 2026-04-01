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
          <button class="editor-toolbar__btn" @click="showSettings = true">
            ⚙ 설정
          </button>
          <button
            style="color: #f87171"
            @click="isScriptGuideOpen = true"
            class="editor-toolbar__btn"
          >
            !주의
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
    <Teleport to="body">
      <SettingsDialog
        v-if="showSettings"
        @close="showSettings = false"
        @confirm="syncSettingsToIframe"
      />
    </Teleport>
    <Teleport to="body">
      <div
        v-if="isScriptGuideOpen"
        class="slot-dialog__backdrop"
        style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        "
        @click.self="isScriptGuideOpen = false"
      >
        <div
          class="slot-dialog"
          style="
            background: white;
            border-radius: 8px;
            width: 1200px;
            max-width: 90%;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          "
        >
          <div
            class="slot-dialog__header"
            style="padding: 16px; border-bottom: 1px solid #e2e8f0"
          >
            <span
              class="slot-dialog__title"
              style="
                display: block;
                font-size: 16px;
                font-weight: bold;
                color: #1e293b;
              "
              >스크립트 실행 주의사항</span
            >
            <span
              class="slot-dialog__sub"
              style="
                display: block;
                font-size: 12px;
                color: #64748b;
                margin-top: 4px;
              "
              >런타임 엔진 방식에 따른 차이점을 확인하세요.</span
            >
          </div>

          <div
            class="slot-dialog__body"
            style="
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 8px;
            "
          >
            <div
              v-for="(guide, idx) in scriptGuides"
              :key="idx"
              class="slot-dialog__option"
              style="
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                padding: 12px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                background: #f8fafc;
              "
            >
              <div
                style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  margin-bottom: 4px;
                "
              >
                <span style="color: #f59e0b; font-weight: bold">!</span>
                <span
                  style="font-size: 13px; font-weight: 600; color: #1e293b"
                  >{{ guide.title }}</span
                >
              </div>
              <span
                style="
                  font-size: 12px;
                  color: #475569;
                  line-height: 1.5;
                  margin-left: 16px;
                "
              >
                {{ guide.content }}
              </span>
            </div>

            <div
              style="
                margin-top: 12px;
                padding: 12px;
                background-color: #fef2f2;
                border: 1px solid #fee2e2;
                border-radius: 6px;
              "
            >
              <p
                style="
                  font-size: 12px;
                  color: #dc2626;
                  font-weight: 600;
                  line-height: 1.6;
                  margin: 0;
                "
              >
                ※ 본 시스템은 표준 Vue 컴파일러가 아닌 별도의 실행 엔진을
                사용합니다. 이에 따라 기존 Vue 코드와 동작 방식이 다를 수
                있으며, 현재 시스템이 파악하지 못한 예외 사례가 발생할 가능성이
                있습니다. 코드 작성 후 반드시 실제 동작을 확인하시기 바랍니다.
              </p>
            </div>
          </div>

          <div
            class="slot-dialog__footer"
            style="
              padding: 12px 16px;
              background: #f8fafc;
              border-top: 1px solid #e2e8f0;
              text-align: right;
            "
          >
            <button
              style="
                padding: 6px 16px;
                background: #1e293b;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
              "
              @click="isScriptGuideOpen = false"
            >
              확인했습니다
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
import SettingsDialog from './SettingsDialog.vue';
import { useSettings } from '@ide-demo/shared';

const canvasRef = ref<InstanceType<typeof Canvas> | null>(null);

function syncSettingsToIframe(newSettings: any) {
  // canvasRef를 통해 자식 컴포넌트인 Canvas.vue의 함수를 호출
  if (canvasRef.value) {
    canvasRef.value.syncSettings(newSettings);
    console.log('Iframe으로 프록시 설정 동기화 요청 완료');
  } else {
    console.warn(
      'Canvas 컴포넌트가 로드되지 않아 설정을 동기화할 수 없습니다.',
    );
  }
}
// 상세 가이드 모달 표시 여부
const isScriptGuideOpen = ref(true);

// 상세 주의사항 데이터
const scriptGuides = [
  {
    title: '양방향 바인딩(v-model) 제약',
    content:
      "v-model에는 'userName' 같은 단일 변수명만 사용하세요. 'count + 1' 같은 연산식은 값을 저장할 위치를 찾지 못해 데이터가 유실될 수 있습니다.",
  },
  {
    title: '반응성(Reactivity) 추적 한계',
    content:
      "메소드 호출(:prop='check()')은 내부 변수 변화를 즉시 감지하지 못할 수 있습니다.",
  },
  {
    title: '런타임 해석 엔진의 특성',
    content:
      '표준 Vue 컴파일러와 달리 실시간 문자열 해석 방식을 사용합니다. 복잡한 객체 구조나 깊은 단계의 경로는 시스템이 잘못 판단할 가능성이 있습니다.',
  },
  {
    title: '.value 사용 규칙',
    content:
      '바인딩 창에서는 편의상 .value를 생략할 수 있지만, 스크립트 작성 영역에서는 표준 JS 규칙에 따라 .value를 명시해야 합니다.',
  },
  {
    title: '동적 프록시(Proxy) 및 CORS 주의',
    content:
      "설정에서 변경한 프록시 타겟 주소는 브라우저가 직접 호출합니다. 호출하려는 서버에서 'CORS(Cross-Origin Resource Sharing)' 허용 설정이 되어 있지 않으면 통신이 차단됩니다.",
  },
  {
    title: 'Mixed Content (보안 프로토콜) 제한',
    content:
      '현재 사이트가 HTTPS로 접속 중이라면, HTTP 주소로의 API 호출이나 웹소켓 연결(ws://)은 브라우저 보안 정책에 의해 거부될 수 있습니다. 가능하면 HTTPS/WSS 주소를 사용하세요.',
  },
  {
    title: '프록시 경로 매칭 규칙',
    content:
      "요청 URL의 시작 부분이 설정된 'Path'와 일치할 때만 타겟 주소로 치환됩니다. 예를 들어 '/api' 규칙은 '/api/user'에는 적용되지만 'api/user'(슬래시 없음)에는 적용되지 않을 수 있습니다.",
  },
];

const { settings } = useSettings();
const showSettings = ref(false);

const store = useEditorStore();

const activeTab = ref<'edit' | 'json' | 'code'>('edit');
const copyLabel = ref('코드 복사');
const showScriptDialog = ref(false);

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
