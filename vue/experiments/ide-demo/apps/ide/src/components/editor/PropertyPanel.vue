<template>
  <div class="props-panel">
    <div class="section-label">속성 편집</div>

    <div v-if="!store.selectedNode" class="props-panel__empty">
      캔버스에서 컴포넌트를<br />선택하면 속성을<br />편집할 수 있습니다.
    </div>

    <template v-else>
      <div class="props-panel__header">
        <span class="props-panel__type">{{ store.selectedNode.type }}</span>
        <span class="props-panel__id">#{{ store.selectedNode.id }}</span>
      </div>

      <div class="props-panel__scroll">
        <div class="props-panel__section-divider">
          <span class="props-panel__section-title">PROPERTIES</span>
        </div>

        <template v-for="(fieldDef, key) in meta?.props || {}" :key="key">
          <div class="props-panel__field">
            <div class="props-panel__field-header">
              <label class="props-panel__field-label">{{
                fieldDef.label
              }}</label>
              <div class="props-panel__field-actions">
                <span
                  v-if="fieldDef.description"
                  class="props-panel__field-info"
                  :title="fieldDef.description"
                  >ⓘ</span
                >

                <button
                  v-if="fieldDef.type !== 'binding'"
                  :class="[
                    'props-panel__bind-toggle',
                    {
                      'props-panel__bind-toggle--active': isBindMode(
                        String(key),
                      ),
                    },
                  ]"
                  @click="toggleBindMode(String(key))"
                >
                  { }
                </button>
              </div>
            </div>

            <div
              v-if="fieldDef.type === 'binding' || isBindMode(String(key))"
              class="props-panel__binding-container"
            >
              <div class="props-panel__binding-row">
                <input
                  type="text"
                  :value="
                    bindingDrafts[String(key)] ??
                    store.selectedNode!.props[key] ??
                    ''
                  "
                  class="props-panel__input props-panel__input--binding"
                  placeholder="변수명 또는 표현식"
                  @input="onBindingInput(String(key), $event)"
                  @focus="showBindingSuggestions = String(key)"
                  @blur="hideSuggestions"
                  @keydown.enter="confirmBinding(String(key))"
                />
                <button
                  class="props-panel__binding-confirm"
                  :class="{
                    'props-panel__binding-confirm--active':
                      bindingDrafts[String(key)] !== undefined,
                  }"
                  @click="confirmBinding(String(key))"
                >
                  ✓
                </button>
              </div>

              <div
                v-if="showBindingSuggestions === String(key)"
                class="props-panel__suggestions"
              >
                <div
                  v-for="s in getSuggestions(String(key))"
                  :key="s.value"
                  class="props-panel__suggestion"
                  @mousedown.prevent="onSelectSuggestion(String(key), s.value)"
                >
                  <span class="props-panel__suggestion-name">{{
                    s.value
                  }}</span>
                  <span class="props-panel__suggestion-type">{{ s.type }}</span>
                </div>
              </div>
            </div>

            <template v-else>
              <div
                v-if="fieldDef.type === 'boolean'"
                class="props-panel__field-bool"
              >
                <input
                  type="checkbox"
                  :checked="!!store.selectedNode!.props[key]"
                  class="props-panel__checkbox"
                  @change="
                    onPropChange(String(key), ($event.target as any).checked)
                  "
                />
                <span class="props-panel__field-bool-label">
                  {{ store.selectedNode!.props[key] ? 'true' : 'false' }}
                </span>
              </div>

              <select
                v-else-if="fieldDef.type === 'select'"
                :value="store.selectedNode!.props[key] ?? ''"
                class="props-panel__select"
                @change="
                  onPropChange(String(key), ($event.target as any).value)
                "
              >
                <option v-for="opt in fieldDef.options" :key="opt" :value="opt">
                  {{ opt || '(기본)' }}
                </option>
              </select>

              <input
                v-else-if="fieldDef.type === 'number'"
                type="number"
                :value="store.selectedNode!.props[key] ?? ''"
                class="props-panel__input"
                @input="onPropChange(String(key), ($event.target as any).value)"
              />

              <input
                v-else
                type="text"
                :value="store.selectedNode!.props[key] ?? ''"
                class="props-panel__input"
                @input="onPropChange(String(key), ($event.target as any).value)"
              />
            </template>
          </div>
        </template>

        <template v-if="meta?.events && meta.events.length > 0">
          <div class="props-panel__section-divider">
            <span
              class="props-panel__section-title props-panel__section-title--event"
              >EVENTS</span
            >
          </div>

          <div
            v-for="ev in meta.events"
            :key="ev.name"
            class="props-panel__field"
          >
            <div class="props-panel__field-header">
              <label
                class="props-panel__field-label props-panel__field-label--event"
                >@{{ ev.name }}</label
              >
              <span
                v-if="ev.description"
                class="props-panel__field-info"
                :title="ev.description"
                >ⓘ</span
              >
            </div>
            <select
              :value="store.selectedNode!.events[ev.name] ?? ''"
              class="props-panel__select props-panel__select--event"
              @change="onEventChange(ev.name, ($event.target as any).value)"
            >
              <option value="">(연결 없음)</option>
              <option v-for="fn in functions" :key="fn.name" :value="fn.name">
                {{ fn.name }}(){{ fn.isAsync ? ' async' : '' }}
              </option>
            </select>
          </div>
        </template>

        <div class="props-panel__delete-area">
          <button
            class="props-panel__delete-btn"
            @click="store.removeNode(store.selectedId!)"
          >
            컴포넌트 삭제
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { componentRegistry } from '@ide-demo/editor';
import { useEditorStore } from '@/composables/useEditorStore';
import { useScriptParser } from '@/composables/useScriptParser';

const store = useEditorStore();
const { functions } = useScriptParser(toRef(store, 'script'));

// 컴포넌트 메타 정보 계산
const meta = computed(() => {
  if (!store.selectedNode) return null;
  return componentRegistry[store.selectedNode.type];
});

// 상태 관리
const showBindingSuggestions = ref<string | null>(null);
const bindingDrafts = ref<Record<string, string>>({});
const bindModes = ref<Record<string, boolean>>({});

// 바인딩 모드 여부 확인
const isBindMode = (key: string) => bindModes.value[key] === true;

// 바인딩 모드 토글 및 스토어 동기화
function toggleBindMode(key: string) {
  bindModes.value[key] = !bindModes.value[key];
  if (store.selectedId) {
    store.updateNodeBindMode(store.selectedId, key, bindModes.value[key]);
  }
  if (!bindModes.value[key]) {
    delete bindingDrafts.value[key];
  }
}

// 노드 변경 시 로컬 상태 초기화 및 로드
watch(
  () => store.selectedId,
  () => {
    bindingDrafts.value = {};
    bindModes.value = store.selectedNode?.bindModes
      ? { ...store.selectedNode.bindModes }
      : {};
  },
  { immediate: true },
);

// 제안창 숨기기 (클릭 이벤트 처리를 위한 지연)
function hideSuggestions() {
  setTimeout(() => {
    showBindingSuggestions.value = null;
  }, 150);
}

// 일반 속성 변경 핸들러
function onPropChange(key: string, value: any) {
  if (!store.selectedId || !meta.value) return;

  const fieldDef = meta.value.props[key];
  let finalValue = value;

  if (fieldDef?.type === 'number') {
    const num = Number(value);
    finalValue = isNaN(num) ? value : num;
  } else if (fieldDef?.type === 'boolean') {
    finalValue = !!value;
  }

  store.updateNodeProp(store.selectedId, key, finalValue);
}

// 바인딩 입력 핸들러
function onBindingInput(key: string, event: Event) {
  bindingDrafts.value[key] = (event.target as HTMLInputElement).value;
}

// 바인딩 확정
function confirmBinding(key: string) {
  if (!store.selectedId) return;
  const val = bindingDrafts.value[key];
  if (val !== undefined) {
    store.updateNodeProp(store.selectedId, key, val);
    delete bindingDrafts.value[key];
  }
  showBindingSuggestions.value = null;
}

// 제안 목록에서 선택
function onSelectSuggestion(key: string, value: string) {
  if (!store.selectedId) return;
  store.updateNodeProp(store.selectedId, key, value);
  delete bindingDrafts.value[key];
  showBindingSuggestions.value = null;
}

// 자동완성 목록 생성
function getSuggestions(propKey: string) {
  const suggestions: { value: string; type: string }[] = [];
  const names = store.scriptStatus?.bindingNames ?? [];

  for (const name of names) {
    suggestions.push({ value: name, type: 'variable' });
    suggestions.push({ value: `${name}.value`, type: 'ref' });
  }

  const current =
    bindingDrafts.value[propKey] ?? store.selectedNode?.props[propKey] ?? '';
  if (current && typeof current === 'string') {
    return suggestions.filter((s) =>
      s.value.toLowerCase().includes(current.toLowerCase()),
    );
  }
  return suggestions;
}

// 이벤트 핸들러 변경
function onEventChange(eventName: string, handlerName: string) {
  if (!store.selectedId) return;
  store.updateNodeEvent(store.selectedId, eventName, handlerName);
}
</script>

<style scoped lang="scss">
.props-panel {
  height: 100%;
  background: var(--ide-surface);
  display: flex;
  flex-direction: column;

  .section-label {
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 700;
    color: var(--ide-text-dimmer);
    background: var(--ide-bg-alt);
    border-bottom: 1px solid var(--ide-border);
    text-transform: uppercase;
  }

  &__empty {
    padding: 40px 20px;
    color: var(--ide-text-dimmer);
    text-align: center;
    font-size: 12px;
    line-height: 1.6;
  }

  &__header {
    padding: 12px 14px;
    border-bottom: 1px solid var(--ide-border);
    display: flex;
    align-items: baseline;
  }

  &__type {
    font-size: 14px;
    font-weight: 800;
    color: var(--ide-primary);
    font-family: var(--ide-font-mono);
  }

  &__id {
    font-size: 10px;
    color: var(--ide-text-dimmer);
    margin-left: 8px;
  }

  &__scroll {
    flex: 1;
    overflow-y: auto;
  }

  &__section-divider {
    padding: 16px 14px 6px;
  }

  &__section-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--ide-text-dimmer);
    letter-spacing: 0.05em;

    &--event {
      color: var(--ide-accent-yellow);
    }
  }

  &__field {
    padding: 6px 14px;
  }

  &__field-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  &__field-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--ide-text-muted);

    &--event {
      font-family: var(--ide-font-mono);
      color: var(--ide-accent-yellow);
    }
  }

  &__field-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  &__field-info {
    font-size: 11px;
    color: var(--ide-text-dimmer);
    cursor: help;
  }

  &__bind-toggle {
    background: var(--ide-bg-alt);
    border: 1px solid var(--ide-border);
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 10px;
    cursor: pointer;
    color: var(--ide-text-dimmer);
    transition: all 0.1s;

    &:hover {
      border-color: var(--ide-primary);
      color: var(--ide-primary);
    }
    &--active {
      color: var(--ide-primary);
      border-color: var(--ide-primary);
      background: rgba(99, 102, 241, 0.1);
    }
  }

  &__input,
  &__select {
    width: 100%;
    padding: 6px 10px;
    background: var(--ide-bg);
    border: 1.5px solid var(--ide-border);
    border-radius: 5px;
    color: var(--ide-text);
    font-size: 12px;
    font-family: inherit;
    outline: none;

    &:focus {
      border-color: var(--ide-primary);
    }
  }

  &__input--binding {
    border-color: rgba(99, 102, 241, 0.4);
    font-family: var(--ide-font-mono);
  }

  &__binding-container {
    position: relative;
  }

  &__binding-row {
    display: flex;
    gap: 4px;
  }

  &__binding-confirm {
    padding: 0 8px;
    background: var(--ide-surface-alt);
    border: 1.5px solid var(--ide-border);
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
    color: var(--ide-text-dimmer);

    &--active {
      color: var(--ide-accent-green);
      border-color: var(--ide-accent-green);
      background: rgba(34, 197, 94, 0.1);
    }
  }

  &__suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--ide-bg);
    border: 1px solid var(--ide-border-hover);
    border-radius: 5px;
    z-index: 1000;
    margin-top: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    max-height: 160px;
    overflow-y: auto;
  }

  &__suggestion {
    padding: 6px 10px;
    display: flex;
    justify-content: space-between;
    cursor: pointer;
    font-size: 12px;
    &:hover {
      background: var(--ide-primary-dim);
    }
  }

  &__suggestion-name {
    font-family: var(--ide-font-mono);
  }
  &__suggestion-type {
    font-size: 10px;
    color: var(--ide-text-dimmer);
  }

  &__field-bool {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__checkbox {
    width: 15px;
    height: 15px;
    accent-color: var(--ide-primary);
    cursor: pointer;
  }

  &__field-bool-label {
    font-size: 11px;
    color: var(--ide-text-dimmer);
    font-family: var(--ide-font-mono);
  }

  &__delete-area {
    padding: 24px 14px;
  }

  &__delete-btn {
    width: 100%;
    padding: 8px;
    background: rgba(239, 68, 68, 0.1);
    color: var(--ide-accent-red);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.1s;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: var(--ide-accent-red);
    }
  }
}
</style>
