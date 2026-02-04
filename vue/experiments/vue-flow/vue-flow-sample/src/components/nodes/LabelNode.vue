<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { NodeData } from "../../types";

const props = defineProps<NodeProps<NodeData>>();

const isSelected = computed(() => props.selected);
</script>

<template>
  <div class="label-node" :class="{ selected: isSelected }">
    <div class="label-text" :style="{ color: data?.color || '#f1f5f9' }">
      {{ data?.label }}
    </div>
    <div class="label-desc" v-if="data?.description">
      {{ data.description }}
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
</style>
