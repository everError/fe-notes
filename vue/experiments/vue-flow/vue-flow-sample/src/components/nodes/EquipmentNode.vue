<script setup lang="ts">
import type { NodeProps } from "../../types";
import { NodeWrapper } from "../common";
import { useNode } from "../../composables/useNode";

const props = defineProps<NodeProps>();

const { status, statusColor, isAnimated } = useNode(props);
</script>

<template>
  <NodeWrapper v-bind="$props" node-class="equipment-node">
    <div class="equipment-icon" :class="{ running: isAnimated }">
      <span :style="{ color: data?.color }">{{ data?.icon }}</span>
    </div>

    <div class="node-label">{{ data?.label }}</div>

    <div class="status-bar">
      <span class="status-dot" :style="{ backgroundColor: statusColor }"></span>
      <span class="status-text">{{ status }}</span>
    </div>

    <div class="equipment-stats" v-if="data?.value !== undefined">
      <span class="stat-value">{{ data.value }}</span>
      <span class="stat-unit">{{ data?.unit || "rpm" }}</span>
    </div>
  </NodeWrapper>
</template>

<style scoped>
.equipment-node {
  padding: 12px;
  min-width: 110px;
  text-align: center;
}

.equipment-icon {
  width: 44px;
  height: 44px;
  margin: 0 auto 8px;
  background: #0f172a;
  border: 2px solid #334155;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.equipment-icon.running {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.node-label {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 6px;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-text {
  font-size: 10px;
  color: #64748b;
  text-transform: capitalize;
}

.equipment-stats {
  background: #0f172a;
  border-radius: 4px;
  padding: 4px 8px;
}

.stat-value {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
  font-family: monospace;
}

.stat-unit {
  font-size: 10px;
  color: #64748b;
  margin-left: 2px;
}
</style>
