<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { NodeProps } from "@vue-flow/core";
import type { NodeData } from "../../types";

const props = defineProps<NodeProps<NodeData>>();

const isSelected = computed(() => props.selected);
const isAnimated = computed(() => props.data?.animated);
const status = computed(() => props.data?.status || "normal");

const statusColor = computed(() => {
  const colors = {
    normal: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    offline: "#64748b",
  };
  return colors[status.value] || colors.normal;
});
</script>

<template>
  <div class="equipment-node" :class="{ selected: isSelected }">
    <Handle id="left" type="source" :position="Position.Left" class="handle" />
    <Handle
      id="right"
      type="source"
      :position="Position.Right"
      class="handle"
    />
    <Handle id="top" type="source" :position="Position.Top" class="handle" />
    <Handle
      id="bottom"
      type="source"
      :position="Position.Bottom"
      class="handle"
    />

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
  </div>
</template>

<style scoped>
.equipment-node {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 12px;
  min-width: 110px;
  text-align: center;
  transition: all 0.15s ease;
}

.equipment-node:hover {
  border-color: #475569;
}

.equipment-node.selected {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
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

.handle {
  width: 8px;
  height: 8px;
  background: #475569;
  border: 2px solid #1e293b;
  opacity: 0;
  transition: all 0.15s ease;
}

.equipment-node:hover .handle {
  opacity: 1;
}

.handle:hover {
  background: #6366f1;
  transform: scale(1.2);
}
</style>
