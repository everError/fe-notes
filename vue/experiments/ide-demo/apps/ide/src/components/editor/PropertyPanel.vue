<template>
  <div class="props-panel">
    <div class="section-label">속성</div>

    <!-- 선택된 노드가 없을 때 -->
    <div v-if="!store.selectedNode" class="props-panel__empty">
      캔버스에서 컴포넌트를<br />선택하면 속성을<br />편집할 수 있습니다
    </div>

    <!-- 속성 편집 -->
    <template v-else>
      <!-- 컴포넌트 타입 표시 -->
      <div class="props-panel__header">
        <span class="props-panel__type">{{ store.selectedNode.type }}</span>
        <span class="props-panel__id">#{{ store.selectedNode.id }}</span>
      </div>

      <!-- Props 섹션 -->
      <div class="props-panel__scroll">
        <template v-for="(fieldDef, key) in meta?.props" :key="key">
          <div class="props-panel__field">
            <div class="props-panel__field-header">
              <label class="props-panel__field-label">{{
                fieldDef.label
              }}</label>
              <span
                v-if="fieldDef.description"
                class="props-panel__field-info"
                :title="fieldDef.description"
              >
                ⓘ
              </span>
            </div>

            <!-- Boolean -->
            <div
              v-if="fieldDef.type === 'boolean'"
              class="props-panel__field-bool"
            >
              <input
                type="checkbox"
                :checked="!!store.selectedNode!.props[key]"
                class="props-panel__checkbox"
                @change="
                  onPropChange(
                    key as string,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
              <span class="props-panel__field-bool-label">
                {{ store.selectedNode!.props[key] ? 'true' : 'false' }}
              </span>
            </div>

            <!-- Select -->
            <select
              v-else-if="fieldDef.type === 'select'"
              :value="store.selectedNode!.props[key] ?? ''"
              class="props-panel__select"
              @change="
                onPropChange(
                  key as string,
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option v-for="opt in fieldDef.options" :key="opt" :value="opt">
                {{ opt || '(기본)' }}
              </option>
            </select>

            <!-- Binding (스크립트 변수/표현식 연결) -->
            <div
              v-else-if="fieldDef.type === 'binding'"
              class="props-panel__binding"
            >
              <input
                type="text"
                :value="store.selectedNode!.props[key] ?? ''"
                class="props-panel__input props-panel__input--binding"
                :placeholder="fieldDef.description || '변수명 또는 표현식'"
                @input="
                  onPropChange(
                    key as string,
                    ($event.target as HTMLInputElement).value,
                  )
                "
                @focus="showBindingSuggestions = key as string"
                @blur="hideSuggestions"
              />
              <!-- 자동완성 드롭다운 -->
              <div
                v-if="showBindingSuggestions === key"
                class="props-panel__suggestions"
              >
                <div
                  v-for="s in getSuggestions(key as string)"
                  :key="s.value"
                  class="props-panel__suggestion"
                  @mousedown.prevent="
                    onSelectSuggestion(key as string, s.value)
                  "
                >
                  <span class="props-panel__suggestion-name">{{
                    s.value
                  }}</span>
                  <span class="props-panel__suggestion-type">{{ s.type }}</span>
                </div>
                <div
                  v-if="getSuggestions(key as string).length === 0"
                  class="props-panel__suggestion-empty"
                >
                  스크립트를 먼저 적용하세요
                </div>
              </div>
            </div>

            <!-- Number -->
            <input
              v-else-if="fieldDef.type === 'number'"
              type="number"
              :value="store.selectedNode!.props[key] ?? ''"
              class="props-panel__input"
              :placeholder="fieldDef.description"
              @input="
                onPropChange(
                  key as string,
                  ($event.target as HTMLInputElement).value,
                )
              "
            />

            <!-- Text (default) -->
            <input
              v-else
              type="text"
              :value="store.selectedNode!.props[key] ?? ''"
              class="props-panel__input"
              :placeholder="fieldDef.description"
              @input="
                onPropChange(
                  key as string,
                  ($event.target as HTMLInputElement).value,
                )
              "
            />
          </div>
        </template>

        <!-- Events 섹션 -->
        <template v-if="meta?.events.length">
          <div class="props-panel__section-divider">
            <span
              class="props-panel__section-title props-panel__section-title--event"
              >이벤트</span
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
              >
                @{{ ev.name }}
              </label>
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
              @change="
                onEventChange(
                  ev.name,
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="">(바인딩 없음)</option>
              <option v-for="fn in functions" :key="fn.name" :value="fn.name">
                {{ fn.name }}(){{ fn.isAsync ? ' async' : '' }}
              </option>
            </select>
          </div>
        </template>

        <!-- 삭제 버튼 -->
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
import { computed, ref, toRef } from 'vue';
import { componentRegistry } from '@ide-demo/editor';
import { useEditorStore } from '@/composables/useEditorStore';
import { useScriptParser } from '@/composables/useScriptParser';

const store = useEditorStore();
const { variables, functions, getBindableVariables } = useScriptParser(
  toRef(store, 'script'),
);

const meta = computed(() => {
  if (!store.selectedNode) return null;
  return componentRegistry[store.selectedNode.type];
});

const showBindingSuggestions = ref<string | null>(null);

function hideSuggestions() {
  // blur 시 약간의 딜레이 (mousedown이 먼저 처리되도록)
  setTimeout(() => {
    showBindingSuggestions.value = null;
  }, 150);
}

function getSuggestions(propKey: string): { value: string; type: string }[] {
  const suggestions: { value: string; type: string }[] = [];

  // store.scriptStatus에서 바인딩 이름 가져오기
  const bindingNames = store.scriptStatus?.bindingNames ?? [];

  for (const name of bindingNames) {
    // 변수 자체
    suggestions.push({ value: name, type: 'var' });
    // .value (ref인 경우 — NodeWrapper에서 unref하므로 안 붙여도 되지만 옵션으로)
    // .data 같은 하위 속성 접근용
    suggestions.push({ value: `${name}.data`, type: 'nested' });
    suggestions.push({ value: `${name}.data.value`, type: 'nested' });
  }

  // 현재 입력값으로 필터
  const current = store.selectedNode?.props[propKey] ?? '';
  if (current) {
    return suggestions.filter((s) =>
      s.value.toLowerCase().includes(current.toLowerCase()),
    );
  }

  return suggestions;
}

function onSelectSuggestion(propKey: string, value: string) {
  if (!store.selectedId) return;
  store.updateNodeProp(store.selectedId, propKey, value);
  showBindingSuggestions.value = null;
}

function getBindableVars(filterTypes?: string[]) {
  return getBindableVariables(filterTypes);
}

function onPropChange(key: string, value: any) {
  if (!store.selectedId) return;
  store.updateNodeProp(store.selectedId, key, value);
}

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

  &__empty {
    padding: 24px 16px;
    color: var(--ide-text-dimmer);
    text-align: center;
    font-size: 12px;
    line-height: 1.8;
  }

  &__header {
    padding: 8px 14px 12px;
    border-bottom: 1px solid var(--ide-border);
  }

  &__type {
    font-size: 15px;
    font-weight: 800;
    color: var(--ide-primary-hover);
    font-family: var(--ide-font-mono);
  }

  &__id {
    font-size: 11px;
    color: var(--ide-text-dimmer);
    margin-left: 8px;
  }

  &__scroll {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  &__field {
    padding: 5px 14px;
  }

  &__field-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  &__field-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--ide-text-muted);

    &--event {
      color: var(--ide-accent-yellow);
      font-family: var(--ide-font-mono);
    }
  }

  &__field-info {
    font-size: 11px;
    color: var(--ide-text-dimmer);
    cursor: help;
  }

  &__field-bool {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__field-bool-label {
    font-size: 11px;
    color: var(--ide-text-dim);
    font-family: var(--ide-font-mono);
  }

  &__checkbox {
    width: 16px;
    height: 16px;
    accent-color: var(--ide-primary);
    cursor: pointer;
  }

  &__input {
    width: 100%;
    padding: 6px 10px;
    background: var(--ide-bg);
    border: 1.5px solid var(--ide-border);
    border-radius: 5px;
    color: var(--ide-text);
    font-size: 12px;
    font-family: var(--ide-font-mono);
    outline: none;
    transition: border-color 0.12s;

    &:focus {
      border-color: var(--ide-primary);
    }

    &::placeholder {
      color: var(--ide-text-dimmer);
      font-family: var(--ide-font-sans);
    }
  }

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
    cursor: pointer;
    transition: border-color 0.12s;

    &:focus {
      border-color: var(--ide-primary);
    }

    &--binding {
      border-color: rgba(99, 102, 241, 0.4);
    }

    &--event {
      border-color: rgba(245, 158, 11, 0.3);
    }
  }

  &__section-divider {
    padding: 12px 14px 4px;
    border-top: 1px solid var(--ide-border);
    margin-top: 8px;
  }

  &__section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;

    &--event {
      color: var(--ide-accent-yellow);
    }
  }

  &__delete-area {
    padding: 16px 14px;
    margin-top: 8px;
  }

  &__delete-btn {
    width: 100%;
    padding: 7px 14px;
    background: rgba(239, 68, 68, 0.1);
    color: var(--ide-accent-red);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 5px;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.12s;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: var(--ide-accent-red);
    }

    &__binding {
      position: relative;
    }

    &__input--binding {
      border-color: rgba(99, 102, 241, 0.4);
      font-family: var(--ide-font-mono);
    }

    &__suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--ide-bg);
      border: 1px solid var(--ide-border-hover);
      border-radius: 5px;
      margin-top: 2px;
      max-height: 180px;
      overflow-y: auto;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    &__suggestion {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 10px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.08s;

      &:hover {
        background: var(--ide-primary-dim);
      }
    }

    &__suggestion-name {
      font-family: var(--ide-font-mono);
      color: var(--ide-text);
    }

    &__suggestion-type {
      font-size: 10px;
      color: var(--ide-text-dimmer);
    }

    &__suggestion-empty {
      padding: 8px 10px;
      font-size: 11px;
      color: var(--ide-text-dimmer);
      text-align: center;
    }
  }
}
</style>
