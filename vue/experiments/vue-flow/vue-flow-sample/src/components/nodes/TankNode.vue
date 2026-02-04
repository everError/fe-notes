<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { NodeProps } from "@vue-flow/core";
import type { NodeData } from "../../types";

const props = defineProps<NodeProps<NodeData>>();

const fillPercentage = computed(() => {
  const val = props.data?.value ?? 0;
  const min = props.data?.minValue ?? 0;
  const max = props.data?.maxValue ?? 100;
  return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
});

const fillColor = computed(() => props.data?.color || "#3b82f6");
const isSelected = computed(() => props.selected);
const isAnimated = computed(() => props.data?.animated);
</script>

<template>
  <div class="tank-node" :class="{ selected: isSelected }">
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

    <div class="tank-container">
      <div class="tank-body">
        <div
          class="tank-fill"
          :class="{ animated: isAnimated }"
          :style="{
            height: fillPercentage + '%',
            backgroundColor: fillColor,
          }"
        >
          <div class="tank-wave" v-if="isAnimated"></div>
        </div>
        <div class="tank-level">{{ fillPercentage.toFixed(0) }}%</div>
      </div>
    </div>

    <div class="tank-value">{{ data?.value ?? 0 }} {{ data?.unit || "L" }}</div>
  </div>
</template>

<style scoped>
.tank-node {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 12px;
  min-width: 100px;
  text-align: center;
  transition: all 0.15s ease;
}

.tank-node:hover {
  border-color: #475569;
}

.tank-node.selected {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
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

.handle {
  width: 8px;
  height: 8px;
  background: #475569;
  border: 2px solid #1e293b;
  opacity: 0;
  transition: all 0.15s ease;
}

.tank-node:hover .handle {
  opacity: 1;
}

.handle:hover {
  background: #6366f1;
  transform: scale(1.2);
}
</style>
