<script setup lang="ts">
import type { NodeProps } from "../../types";
import { NodeWrapper } from "../common";
import { useNode } from "../../composables/useNode";

const props = defineProps<NodeProps>();

const { percentage, statusColor } = useNode(props);
</script>

<template>
  <NodeWrapper v-bind="$props" node-class="gauge-node">
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
  </NodeWrapper>
</template>

<style scoped>
.gauge-node {
  padding: 12px;
  min-width: 120px;
  text-align: center;
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
</style>
