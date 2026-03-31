<template>
  <div class="palette">
    <!-- 로고 -->
    <div class="palette__header">
      <span class="palette__logo">◇</span>
      <span class="palette__title">Vue IDE</span>
    </div>

    <!-- 컴포넌트 목록 -->
    <div class="palette__section-label">컴포넌트</div>
    <div class="palette__list">
      <template v-for="group in componentGroups" :key="group.category">
        <div class="palette__cat-label">{{ group.category }}</div>
        <div
          v-for="comp in group.components"
          :key="comp.name"
          class="palette__item"
          draggable="true"
          @dragstart="onDragStart(comp.name, $event)"
          @dragend="onDragEnd"
        >
          <span class="palette__item-icon">{{ comp.icon }}</span>
          <span class="palette__item-name">{{ comp.name }}</span>
        </div>
      </template>
    </div>

    <!-- 스크립트 변수/함수 표시 -->
    <div class="palette__vars">
      <div class="palette__section-label">스크립트 바인딩</div>
      <div class="palette__vars-list">
        <div v-for="v in variables" :key="v.name" class="palette__var-item">
          <span :class="['badge', `badge--${v.type}`]">{{ v.type }}</span>
          <span class="palette__var-name">{{ v.name }}</span>
        </div>
        <div v-for="fn in functions" :key="fn.name" class="palette__var-item">
          <span class="badge badge--fn">fn</span>
          <span class="palette__var-name">{{ fn.name }}()</span>
        </div>
        <div
          v-if="!variables.length && !functions.length"
          class="palette__empty"
        >
          스크립트에 변수/함수를 작성하세요
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { getComponentsByCategory } from '@ide-demo/editor';
import { useEditorStore } from '@/composables/useEditorStore';
import { useScriptParser } from '@/composables/useScriptParser';

const store = useEditorStore();
const { variables, functions } = useScriptParser(toRef(store, 'script'));
const componentGroups = getComponentsByCategory();

function onDragStart(type: string, e: DragEvent) {
  e.dataTransfer!.setData('text/plain', type);
  e.dataTransfer!.effectAllowed = 'copy';
  store.startDrag({ source: 'palette', id: type });
}

function onDragEnd() {
  store.endDrag();
}
</script>

<style scoped lang="scss">
.palette {
  height: 100%;
  background: var(--ide-surface);
  display: flex;
  flex-direction: column;

  &__header {
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__logo {
    font-size: 20px;
    color: var(--ide-primary);
  }

  &__title {
    font-size: 15px;
    font-weight: 800;
    color: var(--ide-text);
    letter-spacing: -0.02em;
  }

  &__section-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ide-primary);
    padding: 10px 16px 6px;
  }

  &__cat-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ide-text-dimmer);
    padding: 10px 16px 4px;
  }

  &__list {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 8px;
  }

  &__item {
    padding: 6px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: grab;
    color: var(--ide-text-muted);
    border-radius: 4px;
    margin: 1px 6px;
    transition: all 0.1s;
    font-size: 13px;

    &:hover {
      background: var(--ide-surface-alt);
      color: var(--ide-text);
    }

    &:active {
      cursor: grabbing;
      opacity: 0.7;
    }
  }

  &__item-icon {
    font-size: 15px;
    width: 22px;
    text-align: center;
  }

  &__vars {
    border-top: 1px solid var(--ide-border);
    max-height: 200px;
    display: flex;
    flex-direction: column;
  }

  &__vars-list {
    overflow-y: auto;
    padding: 0 12px 12px;
  }

  &__var-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 4px;
    font-size: 12px;
  }

  &__var-name {
    color: var(--ide-text-muted);
    font-family: var(--ide-font-mono);
    font-size: 12px;
  }

  &__empty {
    color: var(--ide-text-dimmer);
    font-size: 11px;
    padding: 8px 4px;
  }
}
</style>
