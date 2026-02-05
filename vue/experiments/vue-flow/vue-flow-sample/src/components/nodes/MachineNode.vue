<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { NodeProps } from "@vue-flow/core";
import type { NodeData } from "../../types";

const props = defineProps<NodeProps<NodeData>>();

const isSelected = computed(() => props.selected);
const status = computed(() => props.data?.status || "normal");
const isAnimated = computed(
  () => props.data?.animated && status.value === "normal",
);

const statusColor = computed(() => {
  const colors: Record<string, string> = {
    normal: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    offline: "#64748b",
  };
  return colors[status.value] || colors.normal;
});

const count = computed(() => props.data?.properties?.count ?? 0);
const capacity = computed(() => props.data?.properties?.capacity ?? 100);
const countPercentage = computed(() =>
  Math.min(100, (count.value / capacity.value) * 100),
);
</script>

<template>
  <div class="machine-node" :class="{ selected: isSelected }">
    <Handle id="top" type="source" :position="Position.Top" class="handle" />
    <Handle
      id="bottom"
      type="source"
      :position="Position.Bottom"
      class="handle"
    />
    <Handle id="left" type="source" :position="Position.Left" class="handle" />
    <Handle
      id="right"
      type="source"
      :position="Position.Right"
      class="handle"
    />

    <!-- 설비 본체 -->
    <div class="machine-body">
      <!-- 상단 표시등 -->
      <div class="status-lights">
        <span
          class="light"
          :class="{ active: status === 'normal' }"
          style="background: #10b981"
        ></span>
        <span
          class="light"
          :class="{ active: status === 'warning' }"
          style="background: #f59e0b"
        ></span>
        <span
          class="light"
          :class="{ active: status === 'error' }"
          style="background: #ef4444"
        ></span>
      </div>

      <!-- 메인 디스플레이 -->
      <div class="display">
        <div class="display-value">{{ count }}</div>
        <div class="display-label">/ {{ capacity }}</div>
      </div>

      <!-- 진행 바 -->
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{
            width: countPercentage + '%',
            backgroundColor: statusColor,
          }"
        ></div>
      </div>

      <!-- 컨베이어/롤러 애니메이션 -->
      <div class="conveyor" :class="{ running: isAnimated }">
        <div class="roller"></div>
        <div class="roller"></div>
        <div class="roller"></div>
        <div class="roller"></div>
        <div class="roller"></div>
      </div>
    </div>

    <!-- 라벨 -->
    <div class="machine-label">
      <span class="label-icon" :style="{ color: data?.color }">{{
        data?.icon
      }}</span>
      <span class="label-text">{{ data?.label }}</span>
    </div>

    <!-- 상태 뱃지 -->
    <div class="status-badge" :style="{ backgroundColor: statusColor }">
      {{ status }}
    </div>
  </div>
</template>

<style scoped>
.machine-node {
  background: #1e293b;
  border: 2px solid #334155;
  border-radius: 8px;
  min-width: 140px;
  padding: 0;
  transition: all 0.15s ease;
}

.machine-node:hover {
  border-color: #475569;
}

.machine-node.selected {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.machine-body {
  padding: 10px;
  background: #0f172a;
  border-radius: 6px 6px 0 0;
  border-bottom: 2px solid #334155;
}

.status-lights {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.light {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  opacity: 0.2;
  transition: opacity 0.3s;
}

.light.active {
  opacity: 1;
  box-shadow: 0 0 8px currentColor;
}

.display {
  background: #020617;
  border: 1px solid #1e293b;
  border-radius: 4px;
  padding: 8px;
  text-align: center;
  margin-bottom: 8px;
  font-family: "SF Mono", Monaco, monospace;
}

.display-value {
  font-size: 24px;
  font-weight: 700;
  color: #22d3ee;
  line-height: 1;
  text-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
}

.display-label {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.progress-bar {
  height: 6px;
  background: #1e293b;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.conveyor {
  display: flex;
  gap: 4px;
  justify-content: center;
  padding: 4px 0;
}

.roller {
  width: 16px;
  height: 8px;
  background: linear-gradient(180deg, #475569 0%, #334155 50%, #475569 100%);
  border-radius: 2px;
}

.conveyor.running .roller {
  animation: roll 0.5s linear infinite;
}

@keyframes roll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(20px);
  }
}

.conveyor.running .roller:nth-child(1) {
  animation-delay: 0s;
}
.conveyor.running .roller:nth-child(2) {
  animation-delay: 0.1s;
}
.conveyor.running .roller:nth-child(3) {
  animation-delay: 0.2s;
}
.conveyor.running .roller:nth-child(4) {
  animation-delay: 0.3s;
}
.conveyor.running .roller:nth-child(5) {
  animation-delay: 0.4s;
}

.machine-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
}

.label-icon {
  font-size: 14px;
}

.label-text {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
}

.status-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 9px;
  font-weight: 600;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.handle {
  width: 8px;
  height: 8px;
  background: #475569;
  border: 2px solid #1e293b;
  opacity: 0;
  transition: all 0.15s ease;
}

.machine-node:hover .handle {
  opacity: 1;
}

.handle:hover {
  background: #6366f1;
  transform: scale(1.2);
}
</style>
