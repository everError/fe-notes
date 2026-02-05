<script setup lang="ts">
import { computed } from "vue";
import type { Node, Edge } from "@vue-flow/core";
import type { NodeData } from "../types";
import { GROUP_COLORS, DEFAULTS } from "../constants";

const props = defineProps<{
  node: Node<NodeData> | null;
  edge: Edge | null;
  connectedEdges: Edge[];
  allNodes: Node<NodeData>[];
}>();

const emit = defineEmits<{
  update: [nodeId: string, data: Partial<NodeData>];
  deleteEdge: [edgeId: string];
  deleteNode: [nodeId: string];
  updateNodeSize: [nodeId: string, width: number, height: number];
  setNodeParent: [nodeId: string, parentId: string | null];
}>();

// ==================== Computed ====================

const nodeData = computed(() => props.node?.data);
const properties = computed(() => nodeData.value?.properties || {});

const groupNodes = computed(() =>
  props.allNodes.filter((n) => n.type === "group" && n.id !== props.node?.id)
);

const currentParent = computed(() => props.node?.parentNode || "");
const isGroupNode = computed(() => props.node?.type === "group");
const isMachineNode = computed(() => props.node?.type === "machine");

const nodeWidth = computed(
  () => (props.node?.data?.properties?.width as number) || DEFAULTS.nodeWidth
);
const nodeHeight = computed(
  () => (props.node?.data?.properties?.height as number) || DEFAULTS.nodeHeight
);

const currentColor = computed(() => nodeData.value?.color || "#1e3a5f");

const childNodesCount = computed(() => {
  if (!props.node || !isGroupNode.value) return 0;
  return props.allNodes.filter((n) => n.parentNode === props.node?.id).length;
});

const parentGroup = computed(() =>
  groupNodes.value.find((g) => g.id === currentParent.value)
);

// ==================== Update Handlers ====================

function updateProperty(key: string, value: unknown): void {
  if (props.node) {
    emit("update", props.node.id, {
      properties: { ...properties.value, [key]: value },
    });
  }
}

function updateLabel(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (props.node) {
    emit("update", props.node.id, { label: target.value });
  }
}

function updateDescription(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (props.node) {
    emit("update", props.node.id, { description: target.value });
  }
}

function updateValue(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (props.node) {
    emit("update", props.node.id, { value: Number(target.value) });
  }
}

function updateUnit(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (props.node) {
    emit("update", props.node.id, { unit: target.value });
  }
}

function updateStatus(event: Event): void {
  const target = event.target as HTMLSelectElement;
  if (props.node) {
    emit("update", props.node.id, {
      status: target.value as NodeData["status"],
    });
  }
}

function updateAnimated(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (props.node) {
    emit("update", props.node.id, { animated: target.checked });
  }
}

function updateColor(color: string): void {
  if (props.node) {
    emit("update", props.node.id, { color });
  }
}

function handlePropertyInput(key: string, event: Event): void {
  const target = event.target as HTMLInputElement;
  const value = target.type === "number" ? Number(target.value) : target.value;
  updateProperty(key, value);
}

function updateWidth(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (props.node) {
    emit("updateNodeSize", props.node.id, Number(target.value), nodeHeight.value);
  }
}

function updateHeight(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (props.node) {
    emit("updateNodeSize", props.node.id, nodeWidth.value, Number(target.value));
  }
}

function changeParentGroup(event: Event): void {
  const target = event.target as HTMLSelectElement;
  if (props.node) {
    emit("setNodeParent", props.node.id, target.value || null);
  }
}

function deleteEdge(edgeId: string): void {
  emit("deleteEdge", edgeId);
}

function deleteNode(): void {
  if (props.node) {
    emit("deleteNode", props.node.id);
  }
}

// 숨겨야 할 properties 키
const hiddenPropertyKeys = ["width", "height", "count", "capacity"];

const visibleProperties = computed(() => {
  return Object.entries(properties.value).filter(
    ([key]) => !hiddenPropertyKeys.includes(key)
  );
});
</script>

<template>
  <div class="property-panel">
    <!-- 노드 선택됨 -->
    <template v-if="node && nodeData">
      <div class="panel-header">
        <div class="header-icon" :style="{ color: nodeData.color }">
          {{ nodeData.icon }}
        </div>
        <div class="header-info">
          <span class="header-title">{{ nodeData.label }}</span>
          <span class="header-id">{{ node.id }}</span>
        </div>
      </div>

      <!-- General -->
      <div class="panel-section">
        <div class="section-title">General</div>
        <div class="field">
          <label>Label</label>
          <input type="text" :value="nodeData.label" @input="updateLabel" />
        </div>
        <div class="field">
          <label>Description</label>
          <input
            type="text"
            :value="nodeData.description"
            @input="updateDescription"
            placeholder="Enter description..."
          />
        </div>
      </div>

      <!-- 그룹 노드 색상 -->
      <div class="panel-section" v-if="isGroupNode">
        <div class="section-title">Color</div>
        <div class="color-picker">
          <button
            v-for="color in GROUP_COLORS"
            :key="color.value"
            class="color-swatch"
            :class="{ active: currentColor === color.value }"
            :style="{ backgroundColor: color.value }"
            :title="color.label"
            @click="updateColor(color.value)"
          />
        </div>
      </div>

      <!-- Parent Group (그룹 노드가 아닌 경우) -->
      <div class="panel-section" v-if="!isGroupNode">
        <div class="section-title">Parent Group</div>
        <div class="field">
          <select :value="currentParent" @change="changeParentGroup">
            <option value="">None</option>
            <option
              v-for="group in groupNodes"
              :key="group.id"
              :value="group.id"
            >
              {{ group.data?.label || group.id }}
            </option>
          </select>
        </div>
        <div v-if="parentGroup" class="group-indicator">
          <div
            class="group-color-dot"
            :style="{ backgroundColor: parentGroup.data?.color }"
          ></div>
          <span class="group-name">{{ parentGroup.data?.label }}</span>
        </div>
      </div>

      <!-- 그룹 노드 크기 -->
      <div class="panel-section" v-if="isGroupNode">
        <div class="section-title">Size</div>
        <div class="size-grid">
          <div class="field">
            <label>Width</label>
            <input
              type="number"
              :value="nodeWidth"
              @input="updateWidth"
              :min="DEFAULTS.minNodeWidth"
              step="10"
            />
          </div>
          <div class="field">
            <label>Height</label>
            <input
              type="number"
              :value="nodeHeight"
              @input="updateHeight"
              :min="DEFAULTS.minNodeHeight"
              step="10"
            />
          </div>
        </div>
        <div class="info-row" v-if="childNodesCount > 0">
          <span class="info-label">Children</span>
          <span class="info-value">{{ childNodesCount }}</span>
        </div>
      </div>

      <!-- Machine 노드 카운터 -->
      <div class="panel-section" v-if="isMachineNode">
        <div class="section-title">Counter</div>
        <div class="size-grid">
          <div class="field">
            <label>Count</label>
            <input
              type="number"
              :value="properties.count ?? 0"
              @input="handlePropertyInput('count', $event)"
              min="0"
            />
          </div>
          <div class="field">
            <label>Capacity</label>
            <input
              type="number"
              :value="properties.capacity ?? 100"
              @input="handlePropertyInput('capacity', $event)"
              min="1"
            />
          </div>
        </div>
      </div>

      <!-- Value (모니터링 노드용) -->
      <div
        class="panel-section"
        v-if="nodeData.value !== undefined && !isMachineNode"
      >
        <div class="section-title">Value</div>
        <div class="field">
          <label>Current Value</label>
          <input type="number" :value="nodeData.value" @input="updateValue" />
        </div>
        <div class="field" v-if="nodeData.unit !== undefined">
          <label>Unit</label>
          <input type="text" :value="nodeData.unit" @input="updateUnit" />
        </div>
      </div>

      <!-- State -->
      <div
        class="panel-section"
        v-if="nodeData.status !== undefined || nodeData.animated !== undefined"
      >
        <div class="section-title">State</div>
        <div class="field" v-if="nodeData.status !== undefined">
          <label>Status</label>
          <select :value="nodeData.status" @change="updateStatus">
            <option value="normal">Normal</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="offline">Offline</option>
          </select>
        </div>
        <div
          class="field checkbox-field"
          v-if="nodeData.animated !== undefined"
        >
          <input
            type="checkbox"
            id="animated"
            :checked="nodeData.animated"
            @change="updateAnimated"
          />
          <label for="animated">Animated</label>
        </div>
      </div>

      <!-- Custom Properties -->
      <div class="panel-section" v-if="visibleProperties.length > 0">
        <div class="section-title">Properties</div>
        <div
          v-for="[key, value] in visibleProperties"
          :key="key"
          class="field"
        >
          <label>{{ key }}</label>
          <input
            v-if="typeof value !== 'object'"
            :type="typeof value === 'number' ? 'number' : 'text'"
            :value="value"
            @input="handlePropertyInput(String(key), $event)"
          />
        </div>
      </div>

      <!-- Connections -->
      <div class="panel-section" v-if="connectedEdges.length">
        <div class="section-title">
          Connections ({{ connectedEdges.length }})
        </div>
        <div
          v-for="edgeItem in connectedEdges"
          :key="edgeItem.id"
          class="edge-item"
        >
          <span class="edge-label">
            {{ edgeItem.source }} → {{ edgeItem.target }}
          </span>
          <button class="edge-delete" @click="deleteEdge(edgeItem.id)">✕</button>
        </div>
      </div>

      <!-- Delete -->
      <div class="panel-section">
        <button class="delete-btn" @click="deleteNode">🗑️ Delete Node</button>
      </div>
    </template>

    <!-- 엣지 선택됨 -->
    <template v-else-if="edge">
      <div class="panel-header">
        <div class="header-icon edge-icon">―</div>
        <div class="header-info">
          <span class="header-title">Connection</span>
          <span class="header-id">{{ edge.id }}</span>
        </div>
      </div>
      <div class="panel-section">
        <div class="section-title">Details</div>
        <div class="edge-detail">
          <span class="detail-label">From</span>
          <span class="detail-value">{{ edge.source }}</span>
        </div>
        <div class="edge-detail">
          <span class="detail-label">To</span>
          <span class="detail-value">{{ edge.target }}</span>
        </div>
      </div>
      <div class="panel-section">
        <button class="delete-btn" @click="deleteEdge(edge.id)">
          Delete Connection
        </button>
      </div>
    </template>

    <!-- Empty -->
    <template v-else>
      <div class="empty-state">
        <div class="empty-icon">⬚</div>
        <p class="empty-title">No Selection</p>
        <p class="empty-desc">Select a node or connection</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.property-panel {
  width: 200px;
  background: #1e293b;
  border-left: 1px solid #334155;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid #334155;
}

.header-icon {
  width: 32px;
  height: 32px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.edge-icon {
  color: #6366f1;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.header-title {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
}

.header-id {
  font-size: 10px;
  color: #64748b;
  font-family: monospace;
}

.panel-section {
  padding: 12px;
  border-bottom: 1px solid #334155;
}

.section-title {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.field {
  margin-bottom: 8px;
}

.field:last-child {
  margin-bottom: 0;
}

.field label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.field input,
.field select {
  width: 100%;
  padding: 6px 8px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  font-size: 12px;
  color: #f1f5f9;
  box-sizing: border-box;
}

.field input:focus,
.field select:focus {
  outline: none;
  border-color: #6366f1;
}

.field select {
  cursor: pointer;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-field input {
  width: auto;
}

.checkbox-field label {
  margin-bottom: 0;
}

.size-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 6px 8px;
  background: #0f172a;
  border-radius: 4px;
}

.info-label {
  font-size: 11px;
  color: #64748b;
}

.info-value {
  font-size: 11px;
  color: #e2e8f0;
  font-weight: 500;
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.color-swatch:hover {
  transform: scale(1.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.color-swatch.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
}

.group-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 6px 8px;
  background: #0f172a;
  border-radius: 4px;
}

.group-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.group-name {
  font-size: 11px;
  color: #e2e8f0;
}

.edge-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: #0f172a;
  border-radius: 4px;
  margin-bottom: 4px;
}

.edge-label {
  font-size: 10px;
  color: #94a3b8;
  font-family: monospace;
}

.edge-delete {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 10px;
}

.edge-delete:hover {
  color: #ef4444;
}

.edge-detail {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  background: #0f172a;
  border-radius: 4px;
  margin-bottom: 4px;
}

.detail-label {
  color: #64748b;
}

.detail-value {
  color: #e2e8f0;
  font-family: monospace;
}

.delete-btn {
  width: 100%;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
  color: #ef4444;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
}

.empty-icon {
  font-size: 32px;
  color: #334155;
  margin-bottom: 8px;
}

.empty-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin: 0 0 4px 0;
}

.empty-desc {
  font-size: 11px;
  color: #475569;
  margin: 0;
}
</style>
