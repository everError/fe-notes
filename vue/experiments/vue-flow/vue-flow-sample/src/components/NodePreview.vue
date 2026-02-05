<script setup lang="ts">
import type { NodeTemplate } from "../types";

defineProps<{
  template: NodeTemplate;
  x: number;
  y: number;
}>();
</script>

<template>
  <div class="node-preview" :style="{ left: x + 'px', top: y + 'px' }">
    <div class="preview-header">
      <span class="preview-icon" :style="{ color: template.color }">{{
        template.icon
      }}</span>
      <span class="preview-label">{{ template.label }}</span>
    </div>
    <div class="preview-body">
      <div class="preview-type">Type: {{ template.type }}</div>
      <div class="preview-props">
        <div
          v-for="(value, key) in template.defaultProperties"
          :key="key"
          class="prop-row"
        >
          <span class="prop-key">{{ key }}:</span>
          <span class="prop-value">{{ value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-preview {
  position: fixed;
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  padding: 12px;
  min-width: 180px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  pointer-events: none;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color, #334155);
}

.preview-icon {
  width: 28px;
  height: 28px;
  background: var(--bg-primary, #0f172a);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.preview-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #f1f5f9);
}

.preview-body {
  font-size: 11px;
}

.preview-type {
  color: var(--text-muted, #64748b);
  margin-bottom: 8px;
}

.preview-props {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prop-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 6px;
  background: var(--bg-primary, #0f172a);
  border-radius: 4px;
}

.prop-key {
  color: var(--text-muted, #64748b);
}

.prop-value {
  color: var(--text-secondary, #94a3b8);
  font-family: monospace;
}
</style>
