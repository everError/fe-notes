<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { VueFlow, useVueFlow, MarkerType } from "@vue-flow/core";
import type {
  NodeMouseEvent,
  EdgeMouseEvent,
  Connection,
  NodeDragEvent,
} from "@vue-flow/core";
import { Background, BackgroundVariant } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import CustomNode from "./nodes/CustomNode.vue";
import GaugeNode from "./nodes/GaugeNode.vue";
import TankNode from "./nodes/TankNode.vue";
import StatusNode from "./nodes/StatusNode.vue";
import EquipmentNode from "./nodes/EquipmentNode.vue";
import MachineNode from "./nodes/MachineNode.vue";
import GroupNode from "./nodes/GroupNode.vue";
import LabelNode from "./nodes/LabelNode.vue";
import NodePalette from "./NodePalette.vue";
import PropertyPanel from "./PropertyPanel.vue";
import Toolbar from "./Toolbar.vue";
import ContextMenu from "./ContextMenu.vue";
import type { MenuItem } from "./ContextMenu.vue";
import { useFlowStore } from "../stores/flowStore";
import type { NodeTemplate, NodeData } from "../types";
import type { Node, Edge } from "@vue-flow/core";

const store = useFlowStore();
const { onConnect, addEdges, project, onNodeDragStop } = useVueFlow();

const selectedEdgeId = ref<string | null>(null);
const isSimulating = ref(false);
const dragOverGroupId = ref<string | null>(null);
let simulationInterval: number | null = null;

// Context Menu
const contextMenu = ref<{
  show: boolean;
  x: number;
  y: number;
  items: MenuItem[];
}>({
  show: false,
  x: 0,
  y: 0,
  items: [],
});

const selectedEdge = computed(
  () => store.edges.value.find((e) => e.id === selectedEdgeId.value) || null,
);

const connectedEdges = computed(() => {
  if (!store.selectedNodeId.value) return [];
  const nodeId = store.selectedNodeId.value;
  return store.edges.value.filter(
    (e) => e.source === nodeId || e.target === nodeId,
  );
});

// 연결선 기본 옵션 (방향 표시 화살표)
const defaultEdgeOptions = computed(() => ({
  type: "smoothstep",
  zIndex: 1,
  animated: isSimulating.value,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 15,
    height: 15,
    color: "var(--edge-color, #6366f1)",
  },
  style: {
    strokeWidth: 2,
    stroke: "var(--edge-color, #475569)",
  },
}));

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

onConnect((connection: Connection) => {
  if (!connection.source || !connection.target) return;

  const edge: Edge = {
    id: `e${connection.source}-${connection.target}-${Date.now()}`,
    source: connection.source,
    sourceHandle: connection.sourceHandle,
    target: connection.target,
    targetHandle: connection.targetHandle,
    ...defaultEdgeOptions.value,
  };
  addEdges([edge]);
  store.addEdge(edge);
});

onNodeDragStop((event: NodeDragEvent) => {
  const draggedNode = event.node;
  dragOverGroupId.value = null;

  // 위치 저장 (히스토리)
  store.saveHistory();

  if (draggedNode.type === "group") return;
  if (draggedNode.parentNode) return;

  const nodeCenter = {
    x: draggedNode.position.x + 80,
    y: draggedNode.position.y + 40,
  };

  const group = store.findGroupAtPosition(nodeCenter, draggedNode.id);

  if (group) {
    store.setNodeParent(draggedNode.id, group.id);
  }
});

const flowContainer = ref<HTMLDivElement | null>(null);

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  if (event.dataTransfer?.types.includes("application/vueflow")) {
    const bounds = flowContainer.value?.getBoundingClientRect();
    if (bounds) {
      const position = project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      const group = store.findGroupAtPosition(position);
      dragOverGroupId.value = group?.id || null;
    }
  }
}

function onDragLeave() {
  dragOverGroupId.value = null;
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  dragOverGroupId.value = null;

  const data = event.dataTransfer?.getData("application/vueflow");
  if (!data || !flowContainer.value) return;

  const template: NodeTemplate = JSON.parse(data);

  const bounds = flowContainer.value.getBoundingClientRect();
  const position = project({
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  });

  const newNodeId = getId();

  const newNode: Node<NodeData> = {
    id: newNodeId,
    type: template.type,
    position: store.snapPosition(position),
    zIndex: template.type === "group" ? -1000 : 0,
    data: {
      label: template.label,
      description: "",
      color: template.color,
      icon: template.icon,
      properties: { ...template.defaultProperties },
      ...template.defaultProperties,
    },
  };

  store.addNode(newNode);

  if (template.type !== "group") {
    const group = store.findGroupAtPosition(position);
    if (group) {
      store.setNodeParent(newNodeId, group.id);
    }
  }

  store.selectNode(newNodeId);
  selectedEdgeId.value = null;
}

function onNodeClick({ node }: NodeMouseEvent) {
  store.selectNode(node.id);
  selectedEdgeId.value = null;
  contextMenu.value.show = false;
}

function onEdgeClick({ edge }: EdgeMouseEvent) {
  selectedEdgeId.value = edge.id;
  store.selectNode(null);
  contextMenu.value.show = false;
}

function onPaneClick() {
  store.selectNode(null);
  selectedEdgeId.value = null;
  contextMenu.value.show = false;
}

// Context Menu
function onNodeContextMenu(event: MouseEvent | TouchEvent, node: Node) {
  event.preventDefault();
  store.selectNode(node.id);

  const x = "clientX" in event ? event.clientX : event.touches[0]!.clientX;
  const y = "clientY" in event ? event.clientY : event.touches[0]!.clientY;

  contextMenu.value = {
    show: true,
    x,
    y,
    items: [
      { label: "Duplicate", icon: "📋", action: () => duplicateNode(node.id) },
      { label: "Delete", icon: "🗑️", action: () => store.removeNode(node.id) },
      { divider: true, label: "", action: () => {} },
      {
        label: "Bring to Front",
        icon: "⬆",
        action: () => bringToFront(node.id),
      },
      { label: "Send to Back", icon: "⬇", action: () => sendToBack(node.id) },
    ],
  };
}

function onEdgeContextMenu(event: MouseEvent | TouchEvent, edge: Edge) {
  event.preventDefault();
  selectedEdgeId.value = edge.id;

  const x = "clientX" in event ? event.clientX : event?.touches[0]!.clientX;
  const y = "clientY" in event ? event.clientY : event.touches[0]!.clientY;

  contextMenu.value = {
    show: true,
    x,
    y,
    items: [
      {
        label: "Delete Connection",
        icon: "🗑️",
        action: () => store.removeEdge(edge.id),
      },
    ],
  };
}

function onPaneContextMenu(event: MouseEvent | TouchEvent) {
  event.preventDefault();

  const x = "clientX" in event ? event.clientX : event.touches[0]!.clientX;
  const y = "clientY" in event ? event.clientY : event.touches[0]!.clientY;

  contextMenu.value = {
    show: true,
    x,
    y,
    items: [
      { label: "Paste", icon: "📋", action: () => {}, disabled: true },
      { divider: true, label: "", action: () => {} },
      { label: "Select All", icon: "☑", action: selectAll },
      { label: "Fit View", icon: "⊞", action: fitView },
    ],
  };
}

function duplicateNode(nodeId: string) {
  const node = store.nodes.value.find((n) => n.id === nodeId);
  if (!node) return;

  const newNode: Node<NodeData> = {
    ...JSON.parse(JSON.stringify(node)),
    id: getId(),
    position: {
      x: node.position.x + 50,
      y: node.position.y + 50,
    },
    selected: false,
  };

  store.addNode(newNode);
  store.selectNode(newNode.id);
}

function bringToFront(nodeId: string) {
  const node = store.nodes.value.find((n) => n.id === nodeId);
  if (node && node.type !== "group") {
    node.zIndex = 100;
  }
}

function sendToBack(nodeId: string) {
  const node = store.nodes.value.find((n) => n.id === nodeId);
  if (node && node.type !== "group") {
    node.zIndex = 0;
  }
}

function selectAll() {
  store.nodes.value.forEach((n: any) => (n.selected = true));
}

function fitView() {
  // VueFlow의 fitView 사용
}

function onPropertyUpdate(nodeId: string, data: Partial<NodeData>) {
  store.updateNodeData(nodeId, data);
}

function onDeleteEdge(edgeId: string) {
  store.removeEdge(edgeId);
  if (selectedEdgeId.value === edgeId) {
    selectedEdgeId.value = null;
  }
}

function onDeleteNode(nodeId: string) {
  store.removeNode(nodeId);
}

function onUpdateNodeSize(nodeId: string, width: number, height: number) {
  store.updateNodeSize(nodeId, width, height);
}

function onSetNodeParent(nodeId: string, parentId: string | null) {
  store.setNodeParent(nodeId, parentId);
}

function onGroupResize(nodeId: string, width: number, height: number) {
  store.updateNodeSize(nodeId, width, height);
}

// 실시간 시뮬레이션
function toggleSimulation() {
  isSimulating.value = !isSimulating.value;

  // 엣지 애니메이션 토글
  store.edges.value.forEach((edge) => {
    edge.animated = isSimulating.value;
  });

  if (isSimulating.value) {
    simulationInterval = window.setInterval(() => {
      store.nodes.value.forEach((node) => {
        if (!node.data) return;

        if (node.data.value !== undefined) {
          const min = node.data.minValue ?? 0;
          const max = node.data.maxValue ?? 100;
          const range = max - min;
          const change = (Math.random() - 0.5) * range * 0.1;
          const newValue = Math.max(
            min,
            Math.min(max, (node.data.value || 0) + change),
          );
          node.data.value = Math.round(newValue * 10) / 10;

          const percentage = ((newValue - min) / range) * 100;
          if (percentage >= 90) {
            node.data.status = "error";
          } else if (percentage >= 70) {
            node.data.status = "warning";
          } else {
            node.data.status = "normal";
          }
        }

        if (
          node.type === "machine" &&
          node.data.properties?.count !== undefined
        ) {
          const capacity = node.data.properties.capacity || 100;
          const currentCount = node.data.properties.count || 0;

          if (node.data.status === "normal" && node.data.animated) {
            const increment = Math.floor(Math.random() * 3) + 1;
            node.data.properties.count = Math.min(
              capacity,
              currentCount + increment,
            );

            if (node.data.properties.count >= capacity) {
              node.data.properties.count = 0;
            }
          }
        }

        if (node.data.status && Math.random() < 0.02) {
          const statuses: NodeData["status"][] = ["normal", "warning", "error"];
          node.data.status =
            statuses[Math.floor(Math.random() * statuses.length)];
        }
      });
    }, 500);
  } else {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  }
}

function saveToDatabase() {
  const data = store.serialize();
  console.log("Save data:", JSON.stringify(data, null, 2));
  alert("Check console for save data!");
}

function onKeyDown(event: KeyboardEvent) {
  // Undo/Redo
  if ((event.ctrlKey || event.metaKey) && event.key === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      store.redo();
    } else {
      store.undo();
    }
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key === "y") {
    event.preventDefault();
    store.redo();
    return;
  }

  if (
    (event.target as HTMLElement).tagName === "INPUT" ||
    (event.target as HTMLElement).tagName === "TEXTAREA"
  ) {
    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    if (store.selectedNodeId.value) {
      store.removeNode(store.selectedNodeId.value);
    } else if (selectedEdgeId.value) {
      store.removeEdge(selectedEdgeId.value);
      selectedEdgeId.value = null;
    }
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeyDown);
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }
});

function getGroupClass(nodeId: string) {
  return dragOverGroupId.value === nodeId ? "drag-target" : "";
}
</script>

<template>
  <div class="editor-container" :class="store.theme.value">
    <NodePalette />

    <div
      ref="flowContainer"
      class="flow-container"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    >
      <VueFlow
        v-model:nodes="store.nodes.value"
        v-model:edges="store.edges.value"
        :connect-on-click="true"
        :default-edge-options="defaultEdgeOptions"
        :elevate-nodes-on-select="false"
        :snap-to-grid="store.snapToGrid.value"
        :snap-grid="[store.gridSize.value, store.gridSize.value]"
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        @pane-click="onPaneClick"
        @node-context-menu="(e) => onNodeContextMenu(e.event, e.node)"
        @edge-context-menu="(e) => onEdgeContextMenu(e.event, e.edge)"
        @pane-context-menu="onPaneContextMenu"
        fit-view-on-init
        :default-zoom="1"
        :min-zoom="0.2"
        :max-zoom="4"
      >
        <template #node-custom="nodeProps">
          <CustomNode v-bind="nodeProps" />
        </template>
        <template #node-gauge="nodeProps">
          <GaugeNode v-bind="nodeProps" />
        </template>
        <template #node-tank="nodeProps">
          <TankNode v-bind="nodeProps" />
        </template>
        <template #node-status="nodeProps">
          <StatusNode v-bind="nodeProps" />
        </template>
        <template #node-equipment="nodeProps">
          <EquipmentNode v-bind="nodeProps" />
        </template>
        <template #node-machine="nodeProps">
          <MachineNode v-bind="nodeProps" />
        </template>
        <template #node-group="nodeProps">
          <GroupNode
            v-bind="nodeProps"
            :class="getGroupClass(nodeProps.id)"
            @resize="(w, h) => onGroupResize(nodeProps.id, w, h)"
          />
        </template>
        <template #node-label="nodeProps">
          <LabelNode v-bind="nodeProps" />
        </template>

        <Background
          :variant="
            store.snapToGrid.value
              ? BackgroundVariant.Lines
              : BackgroundVariant.Dots
          "
          :gap="store.gridSize.value"
          :size="1"
          :pattern-color="store.theme.value === 'dark' ? '#334155' : '#cbd5e1'"
        />
        <Controls position="bottom-left" />
        <MiniMap position="bottom-right" :pannable="true" :zoomable="true" />
      </VueFlow>

      <Toolbar
        :is-simulating="isSimulating"
        @simulate="toggleSimulation"
        @save="saveToDatabase"
      />

      <div class="shortcut-hint">
        <kbd>Delete</kbd> remove · <kbd>Ctrl+Z</kbd> undo ·
        <kbd>Ctrl+Y</kbd> redo
      </div>
    </div>

    <PropertyPanel
      :node="store.selectedNode.value"
      :edge="selectedEdge"
      :connected-edges="connectedEdges"
      :all-nodes="store.nodes.value"
      @update="onPropertyUpdate"
      @delete-edge="onDeleteEdge"
      @delete-node="onDeleteNode"
      @update-node-size="onUpdateNodeSize"
      @set-node-parent="onSetNodeParent"
    />

    <!-- Context Menu -->
    <ContextMenu
      v-if="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenu.items"
      @close="contextMenu.show = false"
    />
  </div>
</template>

<style scoped>
.editor-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: var(--bg-primary);
}

.flow-container {
  flex: 1;
  position: relative;
  background: var(--bg-primary);
}

.shortcut-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: var(--text-muted);
  z-index: 10;
}

.shortcut-hint kbd {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
