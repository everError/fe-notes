<script setup lang="ts">
import type { NodeProps } from "../../types";
import { useNode } from "../../composables/useNode";

const props = defineProps<NodeProps>();

const { isSelected, hasParent, groupColor } = useNode(props);
</script>

<template>
  <div
    class="label-node"
    :class="{ selected: isSelected, 'in-group': hasParent }"
    :style="{ '--group-color': groupColor || 'transparent' }"
  >
    <div class="label-text" :style="{ color: data?.color || '#f1f5f9' }">
      {{ data?.label }}
    </div>
    <div class="label-desc" v-if="data?.description">
      {{ data.description }}
    </div>

    <!-- 그룹 뱃지 -->
    <div
      v-if="hasParent"
      class="group-badge"
      :style="{ backgroundColor: groupColor || '#475569' }"
    >
      ▤
    </div>
  </div>
</template>

<style scoped>
.label-node {
  background: transparent;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: all 0.15s ease;
  cursor: move;
  position: relative;
}

.label-node.in-group {
  box-shadow: 0 0 0 2px var(--group-color, transparent);
}

.label-node:hover {
  background: rgba(30, 41, 59, 0.5);
}

.label-node.selected {
  border-color: #6366f1;
  background: rgba(30, 41, 59, 0.8);
}

.label-text {
  font-size: 14px;
  font-weight: 600;
}

.label-desc {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

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
}
</style>
