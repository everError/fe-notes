<template>
  <component
    :is="resolvedTag"
    :data-node-id="node.id"
    :data-container="meta?.canHaveChildren ? '' : undefined"
    v-bind="cleanProps"
    :class="[node.props.class, { 'node--selected': isSelected }]"
  >
    <!--
      슬롯이 있는 컨테이너 (Card 등)
      각 슬롯을 template #slotName 으로 렌더링
    -->
    <template
      v-for="slotDef in meta?.slots ?? []"
      :key="slotDef.name"
      #[slotDef.name]
    >
      <div
        :data-slot-name="slotDef.name"
        :data-parent-id="node.id"
        :class="[
          'slot-zone',
          { 'slot-drop-zone': !node.slots[slotDef.name]?.length },
        ]"
      >
        <NodeWrapper
          v-for="child in node.slots[slotDef.name] ?? []"
          :key="child.id"
          :node="child"
          :selected-id="selectedId"
        />
        <span v-if="!node.slots[slotDef.name]?.length" class="slot-label">
          #{{ slotDef.name }}
        </span>
      </div>
    </template>

    <!--
      슬롯 없는 컨테이너 (Div 등)
      children을 data-children 래퍼 안에 렌더링
    -->
    <div
      v-if="meta?.canHaveChildren && !meta?.slots?.length"
      data-children
      :class="['children-zone', { 'slot-drop-zone': !node.children?.length }]"
    >
      <NodeWrapper
        v-for="child in node.children ?? []"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
      />
      <span v-if="!node.children?.length" class="slot-label">
        자식 컴포넌트를 드롭하세요
      </span>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EditorNode } from '@ide-demo/editor';
import { componentRegistry } from '@ide-demo/editor';

const props = defineProps<{
  node: EditorNode;
  selectedId: string | null;
}>();

const meta = computed(() => componentRegistry[props.node.type] ?? null);

// Div는 html div로, 나머지는 전역 등록된 컴포넌트명 사용
const resolvedTag = computed(() => {
  if (props.node.type === 'Div') return 'div';
  return meta.value?.tagName ?? props.node.type;
});

const isSelected = computed(() => props.selectedId === props.node.id);

// class를 제외한 props만 v-bind으로 전달
const cleanProps = computed(() => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(props.node.props)) {
    if (key === 'class') continue;
    if (value === '' || value === undefined || value === null) continue;
    result[key] = value;
  }
  return result;
});
</script>

<style scoped>
.slot-zone {
  min-height: 8px;
}

.slot-label {
  font-size: 11px;
  color: #9ca3af;
}

.children-zone {
  min-height: 8px;
}
</style>
``` --- ## 4. ide 앱 변경사항 ### 삭제할 파일 ```
src/components/canvas/CanvasNode.vue ← 삭제
src/components/canvas/ComponentPreview.vue ← 삭제
