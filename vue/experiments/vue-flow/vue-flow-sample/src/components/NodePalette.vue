<script setup lang="ts">
import { ref, computed } from "vue";
import type { NodeTemplate } from "../types";
import NodePreview from "./NodePreview.vue";

const nodeTemplates: NodeTemplate[] = [
  // Basic
  {
    type: "custom",
    label: "Process",
    icon: "⚙",
    color: "#6366f1",
    defaultProperties: { action: "" },
    category: "Basic",
  },
  {
    type: "custom",
    label: "Decision",
    icon: "◇",
    color: "#f59e0b",
    defaultProperties: { condition: "" },
    category: "Basic",
  },
  {
    type: "label",
    label: "Label",
    icon: "T",
    color: "#94a3b8",
    defaultProperties: {},
    category: "Basic",
  },

  // Monitoring
  {
    type: "gauge",
    label: "Gauge",
    icon: "◔",
    color: "#10b981",
    defaultProperties: { value: 50, minValue: 0, maxValue: 100, unit: "%" },
    category: "Monitoring",
  },
  {
    type: "tank",
    label: "Tank",
    icon: "▭",
    color: "#3b82f6",
    defaultProperties: {
      value: 70,
      minValue: 0,
      maxValue: 100,
      unit: "L",
      animated: true,
    },
    category: "Monitoring",
  },
  {
    type: "status",
    label: "Status",
    icon: "●",
    color: "#10b981",
    defaultProperties: { status: "normal", value: 0, unit: "" },
    category: "Monitoring",
  },

  // Equipment
  {
    type: "equipment",
    label: "Motor",
    icon: "⟳",
    color: "#8b5cf6",
    defaultProperties: {
      status: "normal",
      value: 1200,
      unit: "rpm",
      animated: true,
    },
    category: "Equipment",
  },
  {
    type: "equipment",
    label: "Pump",
    icon: "⇶",
    color: "#06b6d4",
    defaultProperties: {
      status: "normal",
      value: 50,
      unit: "L/m",
      animated: false,
    },
    category: "Equipment",
  },
  {
    type: "equipment",
    label: "Valve",
    icon: "⧎",
    color: "#f59e0b",
    defaultProperties: { status: "normal", value: 100, unit: "%" },
    category: "Equipment",
  },
  {
    type: "equipment",
    label: "Sensor",
    icon: "◉",
    color: "#10b981",
    defaultProperties: { status: "normal", value: 25, unit: "°C" },
    category: "Equipment",
  },

  // Machine
  {
    type: "machine",
    label: "Conveyor",
    icon: "▤",
    color: "#06b6d4",
    defaultProperties: {
      status: "normal",
      count: 0,
      capacity: 100,
      animated: true,
    },
    category: "Machine",
  },
  {
    type: "machine",
    label: "Assembly",
    icon: "⚒",
    color: "#8b5cf6",
    defaultProperties: {
      status: "normal",
      count: 45,
      capacity: 100,
      animated: true,
    },
    category: "Machine",
  },
  {
    type: "machine",
    label: "Packing",
    icon: "☐",
    color: "#f59e0b",
    defaultProperties: {
      status: "normal",
      count: 120,
      capacity: 200,
      animated: false,
    },
    category: "Machine",
  },
  {
    type: "machine",
    label: "Inspector",
    icon: "◎",
    color: "#10b981",
    defaultProperties: {
      status: "normal",
      count: 98,
      capacity: 100,
      animated: true,
    },
    category: "Machine",
  },

  // Layout
  {
    type: "group",
    label: "Group",
    icon: "▤",
    color: "#1e3a5f",
    defaultProperties: { description: "Area", width: 250, height: 150 },
    category: "Layout",
  },
];

const categories = computed(() => {
  const cats = [...new Set(nodeTemplates.map((t) => t.category || "Other"))];
  return cats;
});

const expandedCategories = ref<Set<string>>(new Set(["Basic", "Machine"]));

// 노드 미리보기
const previewTemplate = ref<NodeTemplate | null>(null);
const previewPosition = ref({ x: 0, y: 0 });

function toggleCategory(cat: string) {
  if (expandedCategories.value.has(cat)) {
    expandedCategories.value.delete(cat);
  } else {
    expandedCategories.value.add(cat);
  }
}

function getTemplatesByCategory(category: string) {
  return nodeTemplates.filter((t) => (t.category || "Other") === category);
}

function onDragStart(event: DragEvent, template: NodeTemplate) {
  if (event.dataTransfer) {
    event.dataTransfer.setData("application/vueflow", JSON.stringify(template));
    event.dataTransfer.effectAllowed = "move";
  }
  previewTemplate.value = null;
}

function onMouseEnter(event: MouseEvent, template: NodeTemplate) {
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  previewPosition.value = {
    x: rect.right + 10,
    y: rect.top,
  };
  previewTemplate.value = template;
}

function onMouseLeave() {
  previewTemplate.value = null;
}
</script>

<template>
  <div class="node-palette">
    <div class="palette-header">
      <span class="header-title">Components</span>
    </div>

    <div class="category-list">
      <div v-for="category in categories" :key="category" class="category">
        <div class="category-header" @click="toggleCategory(category)">
          <span class="category-icon">{{
            expandedCategories.has(category) ? "▾" : "▸"
          }}</span>
          <span class="category-name">{{ category }}</span>
          <span class="category-count">{{
            getTemplatesByCategory(category).length
          }}</span>
        </div>

        <div class="category-items" v-show="expandedCategories.has(category)">
          <div
            v-for="template in getTemplatesByCategory(category)"
            :key="template.label"
            class="palette-item"
            draggable="true"
            @dragstart="onDragStart($event, template)"
            @mouseenter="onMouseEnter($event, template)"
            @mouseleave="onMouseLeave"
          >
            <div class="item-icon" :style="{ color: template.color }">
              {{ template.icon }}
            </div>
            <span class="item-label">{{ template.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 노드 미리보기 -->
    <NodePreview
      v-if="previewTemplate"
      :template="previewTemplate"
      :x="previewPosition.x"
      :y="previewPosition.y"
    />
  </div>
</template>

<style scoped>
.node-palette {
  width: 160px;
  background: var(--bg-secondary, #1e293b);
  border-right: 1px solid var(--border-color, #334155);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.palette-header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color, #334155);
}

.header-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.category-list {
  flex: 1;
  overflow-y: auto;
}

.category {
  border-bottom: 1px solid var(--border-color, #334155);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.category-header:hover {
  background: var(--bg-hover, #334155);
}

.category-icon {
  font-size: 10px;
  color: var(--text-muted, #64748b);
  width: 12px;
}

.category-name {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary, #e2e8f0);
}

.category-count {
  font-size: 10px;
  color: var(--text-muted, #64748b);
  background: var(--bg-primary, #0f172a);
  padding: 2px 6px;
  border-radius: 8px;
}

.category-items {
  padding: 4px 8px 8px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-primary, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 6px;
  cursor: grab;
  transition: all 0.15s ease;
  margin-bottom: 4px;
}

.palette-item:last-child {
  margin-bottom: 0;
}

.palette-item:hover {
  border-color: var(--border-hover, #475569);
  background: var(--bg-secondary, #1e293b);
}

.palette-item:active {
  cursor: grabbing;
  transform: scale(0.98);
}

.item-icon {
  width: 22px;
  height: 22px;
  background: var(--bg-secondary, #1e293b);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.item-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary, #e2e8f0);
}
</style>
