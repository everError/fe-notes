<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { NodeProps } from "@vue-flow/core";
import type { NodeData } from "../../types";

const props = defineProps<NodeProps<NodeData>>();

const percentage = computed(() => {
  const val = props.data?.value ?? 0;
  const min = props.data?.minValue ?? 0;
  const max = props.data?.maxValue ?? 100;
  return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
});

const statusColor = computed(() => {
  const p = percentage.value;
  if (p >= 80) return "#ef4444";
  if (p >= 60) return "#f59e0b";
  return "#10b981";
});

const isSelected = computed(() => props.selected);
</script>

<template>
  <div class="gauge-node" :class="{ selected: isSelected }">
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

    <div class="node-label">{{ data?.label }}</div>

    <div class="gauge-container">
      <svg viewBox="0 0 100 60" class="gauge-svg">
        <!-- 배경 호 -->
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="#334155"
          stroke-width="8"
          stroke-linecap="round"
        />
        <!-- 값 호 -->
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          :stroke="statusColor"
          stroke-width="8"
          stroke-linecap="round"
          :stroke-dasharray="`${percentage * 1.26} 126`"
          class="gauge-value"
        />
      </svg>
      <div class="gauge-text">
        <span class="gauge-number">{{ data?.value ?? 0 }}</span>
        <span class="gauge-unit">{{ data?.unit || "%" }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gauge-node {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 12px;
  min-width: 120px;
  text-align: center;
  transition: all 0.15s ease;
}

.gauge-node:hover {
  border-color: #475569;
}

.gauge-node.selected {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.node-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 8px;
}

.gauge-container {
  position: relative;
}

.gauge-svg {
  width: 100%;
  height: 60px;
}

.gauge-value {
  transition: stroke-dasharray 0.5s ease;
}

.gauge-text {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

.gauge-number {
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
}

.gauge-unit {
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

.gauge-node:hover .handle {
  opacity: 1;
}

.handle:hover {
  background: #6366f1;
  transform: scale(1.2);
}
</style>
