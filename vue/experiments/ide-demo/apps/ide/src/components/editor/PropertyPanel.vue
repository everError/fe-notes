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

            <!-- Binding (스크립트 변수 연결) -->
            <select
              v-else-if="fieldDef.type === 'binding'"
              :value="store.selectedNode!.props[key] ?? ''"
              class="props-panel__select props-panel__select--binding"
              @change="
                onPropChange(
                  key as string,
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="">(바인딩 없음)</option>
              <option
                v-for="v in getBindableVars(fieldDef.bindingFilter)"
                :key="v.name"
                :value="v.name"
              >
                {{ v.name }} ({{ v.type }})
              </option>
            </select>

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
import { computed, toRef } from 'vue';
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
  }
}
</style>
