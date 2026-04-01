<template>
  <div class="comp-tree">
    <div class="comp-tree__header">
      <span class="comp-tree__title">컴포넌트 트리</span>
    </div>
    <div class="comp-tree__body">
      <div v-if="!store.tree.length" class="comp-tree__empty">
        컴포넌트를 배치하세요
      </div>
      <TreeNode
        v-for="node in store.tree"
        :key="node.id"
        :node="node"
        :depth="0"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '@/composables/useEditorStore';
import TreeNode from './TreeNode.vue';

const store = useEditorStore();
</script>

<style scoped lang="scss">
.comp-tree {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--ide-border);
  max-height: 250px;

  &__header {
    padding: 8px 14px;
    flex-shrink: 0;
  }

  &__title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ide-primary);
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 0 4px 8px;
  }

  &__empty {
    font-size: 11px;
    color: var(--ide-text-dimmer);
    padding: 8px 10px;
  }
}
</style>
