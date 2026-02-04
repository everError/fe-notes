<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { VueFlow, useVueFlow } from "@vue-flow/core";
import type {
  NodeMouseEvent,
  EdgeMouseEvent,
  Connection,
  NodeDragEvent,
  GraphNode,
} from "@vue-flow/core";
import { Background, BackgroundVariant } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import CustomNode from "./nodes/CustomNode.vue";
import GaugeNode from "./nodes/GaugeNode.vue";
import TankNode from "./nodes/TankNode.vue";
import StatusNode from "./nodes/StatusNode.vue";
import EquipmentNode from "./nodes/EquipmentNode.vue";
import GroupNode from "./nodes/GroupNode.vue";
import LabelNode from "./nodes/LabelNode.vue";
import NodePalette from "./NodePalette.vue";
import PropertyPanel from "./PropertyPanel.vue";
import { useFlowStore } from "../stores/flowStore";
import type { NodeTemplate, NodeData } from "../types";
import type { Node, Edge } from "@vue-flow/core";

const store = useFlowStore();
const { onConnect, addEdges, project, onNodeDrag, onNodeDragStop } =
  useVueFlow();

const selectedEdgeId = ref<string | null>(null);
const isSimulating = ref(false);
const dragOverGroupId = ref<string | null>(null);
let simulationInterval: number | null = null;

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
    zIndex: 1, // 엣지가 그룹 위에 표시되도록
  };
  addEdges([edge]);
  store.addEdge(edge);
});

// 드래그 중 그룹 하이라이트
onNodeDrag((event: NodeDragEvent) => {
  const draggedNode = event.node;

  // 그룹 노드이거나 이미 그룹에 속한 노드는 무시
  if (draggedNode.type === "group" || draggedNode.parentNode) {
    dragOverGroupId.value = null;
    return;
  }

  // 노드 중심 계산
  const nodeCenter = {
    x: draggedNode.position.x + 80,
    y: draggedNode.position.y + 40,
  };

  const group = store.findGroupAtPosition(nodeCenter);
  dragOverGroupId.value = group?.id || null;
});

// 노드 드래그 종료 시 그룹 체크
onNodeDragStop((event: NodeDragEvent) => {
  const draggedNode = event.node;
  dragOverGroupId.value = null;

  // 그룹 노드는 다른 그룹에 속하지 않음
  if (draggedNode.type === "group") return;

  // 이미 그룹에 속해있으면 스킵
  if (draggedNode.parentNode) return;

  const nodeCenter = {
    x: draggedNode.position.x + 80,
    y: draggedNode.position.y + 40,
  };

  const group = store.findGroupAtPosition(nodeCenter);

  if (group) {
    const relativePosition = {
      x: draggedNode.position.x - group.position.x,
      y: draggedNode.position.y - group.position.y,
    };

    // 좌상단 경계 체크
    relativePosition.x = Math.max(0, relativePosition.x);
    relativePosition.y = Math.max(30, relativePosition.y); // 헤더 높이

    store.setNodeParent(draggedNode.id, group.id, relativePosition);
  }
});

const flowContainer = ref<HTMLDivElement | null>(null);

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();

  const data = event.dataTransfer?.getData("application/vueflow");
  if (!data || !flowContainer.value) return;

  const template: NodeTemplate = JSON.parse(data);

  const bounds = flowContainer.value.getBoundingClientRect();
  const position = project({
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  });

  // 드롭 위치가 그룹 내부인지 체크 (그룹이 아닌 노드만)
  let parentGroupId: string | undefined;
  let finalPosition = position;

  if (template.type !== "group") {
    const group = store.findGroupAtPosition(position);

    if (group) {
      parentGroupId = group.id;
      finalPosition = {
        x: Math.max(0, position.x - group.position.x),
        y: Math.max(30, position.y - group.position.y),
      };
    }
  }

  const newNode: Node<NodeData> = {
    id: getId(),
    type: template.type,
    position: finalPosition,
    parentNode: parentGroupId,
    extent: parentGroupId
      ? [
          [0, 30],
          [Infinity, Infinity],
        ]
      : undefined,
    expandParent: false,
    zIndex: template.type === "group" ? -1 : 0,
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
  dragOverGroupId.value = null;
}

function onNodeClick({ node }: NodeMouseEvent) {
  store.selectNode(node.id);
  selectedEdgeId.value = null;
}

function onEdgeClick({ edge }: EdgeMouseEvent) {
  selectedEdgeId.value = edge.id;
  store.selectNode(null);
}

function onPaneClick() {
  store.selectNode(null);
  selectedEdgeId.value = null;
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

function onGroupResize(nodeId: string, width: number, height: number) {
  store.updateNodeSize(nodeId, width, height);
}

// 실시간 시뮬레이션
function toggleSimulation() {
  isSimulating.value = !isSimulating.value;

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

// 드래그 오버 중인 그룹 노드 스타일 업데이트
function getGroupClass(nodeId: string) {
  return dragOverGroupId.value === nodeId ? "drag-target" : "";
}
</script>

<template>
  <div class="editor-container">
    <NodePalette />

    <div
      ref="flowContainer"
      class="flow-container"
      @drop="onDrop"
      @dragover="onDragOver"
    >
      <VueFlow
        v-model:nodes="store.nodes.value"
        v-model:edges="store.edges.value"
        :connect-on-click="true"
        :default-edge-options="{ type: 'smoothstep', zIndex: 1 }"
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        @pane-click="onPaneClick"
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
          :variant="BackgroundVariant.Dots"
          :gap="24"
          :size="1"
          pattern-color="#334155"
        />
        <Controls position="bottom-left" />
        <MiniMap position="bottom-right" :pannable="true" :zoomable="true" />
      </VueFlow>

      <div class="toolbar">
        <button
          class="toolbar-btn"
          :class="{ active: isSimulating }"
          @click="toggleSimulation"
        >
          {{ isSimulating ? "⏹ Stop" : "▶ Simulate" }}
        </button>
        <button class="toolbar-btn" @click="saveToDatabase">💾 Save</button>
      </div>

      <div class="shortcut-hint"><kbd>Delete</kbd> to remove selected</div>
    </div>

    <PropertyPanel
      :node="store.selectedNode.value"
      :edge="selectedEdge"
      :connected-edges="connectedEdges"
      @update="onPropertyUpdate"
      @delete-edge="onDeleteEdge"
      @delete-node="onDeleteNode"
      @update-node-size="onUpdateNodeSize"
    />
  </div>
</template>

<style scoped>
.editor-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #0f172a;
}

.flow-container {
  flex: 1;
  position: relative;
  background: #0f172a;
}

.toolbar {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  padding: 8px 12px;
  background: #1e293b;
  color: #f1f5f9;
  border: 1px solid #334155;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar-btn:hover {
  background: #334155;
}

.toolbar-btn.active {
  background: #6366f1;
  border-color: #6366f1;
}

.shortcut-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #64748b;
  z-index: 10;
}

.shortcut-hint kbd {
  background: #334155;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
