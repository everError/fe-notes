<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { NodeProps } from "@vue-flow/core";
import type { NodeData } from "../../types";

const props = defineProps<NodeProps<NodeData>>();

const isSelected = computed(() => props.selected);
const status = computed(() => props.data?.status || "normal");

const statusConfig = computed(() => {
  const configs = {
    normal: { color: "#10b981", label: "Normal", icon: "●" },
    warning: { color: "#f59e0b", label: "Warning", icon: "▲" },
    error: { color: "#ef4444", label: "Error", icon: "■" },
    offline: { color: "#64748b", label: "Offline", icon: "○" },
  };
  return configs[status.value] || configs.normal;
});

const isAnimated = computed(
  () => props.data?.animated && status.value !== "offline",
);
</script>

<template>
  <div class="status-node" :class="{ selected: isSelected }">
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

    <div class="status-indicator" :class="{ pulse: isAnimated }">
      <span
        class="status-dot"
        :style="{ backgroundColor: statusConfig.color }"
      ></span>
    </div>

    <div class="node-content">
      <div class="node-label">{{ data?.label }}</div>
      <div class="status-label" :style="{ color: statusConfig.color }">
        {{ statusConfig.label }}
      </div>
    </div>

    <div class="node-value" v-if="data?.value !== undefined">
      {{ data.value }}{{ data?.unit }}
    </div>
  </div>
</template>

<style scoped>
.status-node {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 12px;
  min-width: 120px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.15s ease;
}

.status-node:hover {
  border-color: #475569;
}

.status-node.selected {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.status-indicator {
  position: relative;
}

.status-dot {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.pulse .status-dot {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

.node-content {
  flex: 1;
}

.node-label {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
}

.status-label {
  font-size: 10px;
  font-weight: 500;
}

.node-value {
  font-size: 14px;
  font-weight: 700;
  color: #e2e8f0;
  font-family: monospace;
}

.handle {
  width: 8px;
  height: 8px;
  background: #475569;
  border: 2px solid #1e293b;
  opacity: 0;
  transition: all 0.15s ease;
}

.status-node:hover .handle {
  opacity: 1;
}

.handle:hover {
  background: #6366f1;
  transform: scale(1.2);
}
</style>
