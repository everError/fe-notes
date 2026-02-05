<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { NodeProps } from "../../types";
import { useNode } from "../../composables/useNode";

const props = defineProps<
  NodeProps & {
    /** 핸들 표시 여부 */
    showHandles?: boolean;
    /** 추가 CSS 클래스 */
    nodeClass?: string;
  }
>();

// const { isSelected, hasParent, groupColor, nodeStyle } = useNode(props);
const node = useNode(props);

const wrapperClass = computed(() => [
  "node-wrapper",
  props.nodeClass,
  {
    selected: node.isSelected,
    "in-group": node.hasParent,
  },
]);

// const showHandles = computed(() => props.showHandles);
</script>

<template>
  <div :class="wrapperClass" :style="node.nodeStyle.value">
    <!-- 핸들 (연결점) -->
    <!-- <template v-if="showHandles"> -->
    <Handle id="top" type="source" :position="Position.Top" class="handle" />
    <Handle
      id="bottom"
      type="source"
      :position="Position.Bottom"
      class="handle"
    />
    <Handle id="left" type="source" :position="Position.Left" class="handle" />
    <Handle
      id="right"
      type="source"
      :position="Position.Right"
      class="handle"
    />
    <!-- </template> -->

    <!-- 노드 콘텐츠 (slot) -->
    <slot />

    <!-- 그룹 뱃지 -->
    <div
      v-if="node.hasParent.value"
      class="group-badge"
      :style="{ backgroundColor: node.groupColor.value || '#475569' }"
    >
      ▤
    </div>
  </div>
</template>

<style scoped>
.node-wrapper {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 10px;
  font-size: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: all 0.15s ease;
  position: relative;
}

.node-wrapper.in-group {
  box-shadow: 0 0 0 3px var(--group-color, transparent);
}

.node-wrapper:hover {
  border-color: var(--border-hover, #475569);
}

.node-wrapper.selected {
  border-color: #6366f1;
  box-shadow:
    0 0 0 2px rgba(99, 102, 241, 0.2),
    0 4px 20px rgba(0, 0, 0, 0.3);
}

/* 그룹 뱃지 */
.group-badge {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

/* 핸들 스타일 */
.handle {
  width: 12px;
  height: 12px;
  background: var(--border-hover, #475569);
  border: 2px solid var(--bg-secondary, #1e293b);
  border-radius: 50%;
  opacity: 0;
  transition: all 0.15s ease;
}

.node-wrapper:hover .handle {
  opacity: 1;
}

.handle:hover {
  background: #6366f1;
  transform: scale(1.2);
}
</style>
