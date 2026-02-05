<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "../../types";
import { NodeWrapper } from "../common";
import { useNode } from "../../composables/useNode";
import { STATUS_CONFIG } from "../../constants";

const props = defineProps<NodeProps>();

const { status, isAnimated } = useNode(props);

const statusConfig = computed(() => {
  return STATUS_CONFIG[status.value] || STATUS_CONFIG.normal;
});
</script>

<template>
  <NodeWrapper v-bind="$props" node-class="status-node">
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
  </NodeWrapper>
</template>

<style scoped>
.status-node {
  padding: 12px;
  min-width: 120px;
  display: flex;
  align-items: center;
  gap: 10px;
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
</style>
