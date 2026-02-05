<script setup lang="ts">
import type { NodeProps } from "../../types";
import { NodeWrapper } from "../common";
import { useNode } from "../../composables/useNode";

const props = defineProps<NodeProps>();

const { percentage, isAnimated } = useNode(props);
</script>

<template>
  <NodeWrapper v-bind="$props" node-class="tank-node">
    <div class="node-label">{{ data?.label }}</div>

    <div class="tank-container">
      <div class="tank-body">
        <div
          class="tank-fill"
          :class="{ animated: isAnimated }"
          :style="{
            height: percentage + '%',
            backgroundColor: data?.color || '#3b82f6',
          }"
        >
          <div class="tank-wave" v-if="isAnimated"></div>
        </div>
        <div class="tank-level">{{ percentage.toFixed(0) }}%</div>
      </div>
    </div>

    <div class="tank-value">{{ data?.value ?? 0 }} {{ data?.unit || "L" }}</div>
  </NodeWrapper>
</template>

<style scoped>
.tank-node {
  padding: 12px;
  min-width: 100px;
  text-align: center;
}

.node-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 8px;
}

.tank-container {
  display: flex;
  justify-content: center;
}

.tank-body {
  width: 50px;
  height: 70px;
  background: #0f172a;
  border: 2px solid #475569;
  border-radius: 4px 4px 10px 10px;
  position: relative;
  overflow: hidden;
}

.tank-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  transition: height 0.5s ease;
}

.tank-fill.animated .tank-wave {
  animation: wave 2s ease-in-out infinite;
}

.tank-wave {
  position: absolute;
  top: -4px;
  left: -10%;
  right: -10%;
  height: 8px;
  background: inherit;
  filter: brightness(1.2);
  border-radius: 50%;
}

@keyframes wave {
  0%,
  100% {
    transform: translateX(-5%) rotate(-2deg);
  }
  50% {
    transform: translateX(5%) rotate(2deg);
  }
}

.tank-level {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 700;
  color: #f1f5f9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.tank-value {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
}
</style>
