<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { NodeProps } from "@vue-flow/core";
import type { NodeData } from "../../types";

const props = defineProps<NodeProps<NodeData>>();

const isSelected = computed(() => props.selected);
</script>

<template>
  <div class="custom-node" :class="{ selected: isSelected }">
    <!-- 4방향 핸들 (모두 source 타입으로 양방향 연결) -->
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

    <div class="node-header">
      <span class="node-icon" :style="{ color: data?.color }">{{
        data?.icon
      }}</span>
      <span class="node-label">{{ data?.label }}</span>
    </div>

    <div
      class="node-body"
      v-if="
        data?.description ||
        (data?.properties && Object.keys(data.properties).length)
      "
    >
      <p class="node-description" v-if="data?.description">
        {{ data.description }}
      </p>
      <div
        class="node-props"
        v-if="data?.properties && Object.keys(data.properties).length"
      >
        <div
          v-for="(value, key) in data.properties"
          :key="key"
          class="prop-item"
        >
          <span class="prop-key">{{ key }}</span>
          <span class="prop-value">{{ value || "—" }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-node {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  min-width: 200px;
  font-size: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: all 0.15s ease;
}

.custom-node:hover {
  border-color: #475569;
}

.custom-node.selected {
  border-color: #6366f1;
  box-shadow:
    0 0 0 2px rgba(99, 102, 241, 0.2),
    0 4px 20px rgba(0, 0, 0, 0.3);
}

.node-header {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #334155;
}

.node-icon {
  width: 28px;
  height: 28px;
  background: #0f172a;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.node-label {
  font-weight: 600;
  color: #f1f5f9;
  font-size: 13px;
}

.node-body {
  padding: 12px 14px;
}

.node-description {
  color: #94a3b8;
  margin: 0 0 10px 0;
  font-size: 11px;
  line-height: 1.4;
}

.node-props {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prop-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: #0f172a;
  border-radius: 4px;
}

.prop-key {
  color: #64748b;
  font-size: 11px;
}

.prop-value {
  color: #cbd5e1;
  font-size: 11px;
  font-family: "SF Mono", Monaco, monospace;
}

.handle {
  width: 12px;
  height: 12px;
  background: #475569;
  border: 2px solid #1e293b;
  border-radius: 50%;
  opacity: 0;
  transition: all 0.15s ease;
}

.custom-node:hover .handle {
  opacity: 1;
}

.handle:hover {
  background: #6366f1;
  transform: scale(1.2);
}
</style>
