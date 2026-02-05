<script setup lang="ts">
import type { NodeProps } from "../../types";
import { NodeWrapper } from "../common";

defineProps<NodeProps>();
</script>

<template>
  <NodeWrapper v-bind="$props" node-class="custom-node">
    <div class="node-header">
      <span class="node-icon" :style="{ color: data?.color }">
        {{ data?.icon }}
      </span>
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
  </NodeWrapper>
</template>

<style scoped>
.custom-node {
  min-width: 200px;
}

.node-header {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--border-color, #334155);
}

.node-icon {
  width: 28px;
  height: 28px;
  background: var(--bg-primary, #0f172a);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.node-label {
  font-weight: 600;
  color: var(--text-primary, #f1f5f9);
  font-size: 13px;
}

.node-body {
  padding: 12px 14px;
}

.node-description {
  color: var(--text-secondary, #94a3b8);
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
  background: var(--bg-primary, #0f172a);
  border-radius: 4px;
}

.prop-key {
  color: var(--text-muted, #64748b);
  font-size: 11px;
}

.prop-value {
  color: var(--text-secondary, #cbd5e1);
  font-size: 11px;
  font-family: "SF Mono", Monaco, monospace;
}
</style>
