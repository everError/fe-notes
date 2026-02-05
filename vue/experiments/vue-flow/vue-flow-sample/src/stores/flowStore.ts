import { ref, computed } from "vue";
import type { Node, Edge, XYPosition } from "@vue-flow/core";
import type { NodeData, HistoryState, Theme } from "../types";

const nodes = ref<Node<NodeData>[]>([]);
const edges = ref<Edge[]>([]);
const selectedNodeId = ref<string | null>(null);

// Undo/Redo
const history = ref<HistoryState[]>([]);
const historyIndex = ref(-1);
const isUndoRedo = ref(false);
const MAX_HISTORY = 50;

// Theme
const theme = ref<Theme>("dark");

// Snap Grid
const snapToGrid = ref(true);
const gridSize = ref(20);

export function useFlowStore() {
  const selectedNode = computed(
    () => nodes.value.find((n) => n.id === selectedNodeId.value) || null,
  );

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  // 상태 저장
  function saveHistory() {
    if (isUndoRedo.value) return;

    const state: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes.value)),
      edges: JSON.parse(JSON.stringify(edges.value)),
    };

    // 현재 위치 이후의 히스토리 삭제
    history.value = history.value.slice(0, historyIndex.value + 1);
    history.value.push(state);

    // 최대 개수 제한
    if (history.value.length > MAX_HISTORY) {
      history.value.shift();
    } else {
      historyIndex.value++;
    }
  }

  function undo() {
    if (!canUndo.value) return;

    isUndoRedo.value = true;
    historyIndex.value--;
    const state = history.value[historyIndex.value];
    if (state) {
      nodes.value = JSON.parse(JSON.stringify(state.nodes));
      edges.value = JSON.parse(JSON.stringify(state.edges));
    }
    selectedNodeId.value = null;

    setTimeout(() => {
      isUndoRedo.value = false;
    }, 0);
  }

  function redo() {
    if (!canRedo.value) return;

    isUndoRedo.value = true;
    historyIndex.value++;
    const state = history.value[historyIndex.value];
    if (state) {
      nodes.value = JSON.parse(JSON.stringify(state.nodes));
      edges.value = JSON.parse(JSON.stringify(state.edges));
    }
    selectedNodeId.value = null;

    setTimeout(() => {
      isUndoRedo.value = false;
    }, 0);
  }

  // 초기 히스토리 저장
  function initHistory() {
    history.value = [
      {
        nodes: [],
        edges: [],
      },
    ];
    historyIndex.value = 0;
  }

  function snapPosition(position: XYPosition): XYPosition {
    if (!snapToGrid.value) return position;
    return {
      x: Math.round(position.x / gridSize.value) * gridSize.value,
      y: Math.round(position.y / gridSize.value) * gridSize.value,
    };
  }

  function addNode(node: Node<NodeData>) {
    if (node.type === "group") {
      node.zIndex = -1000;
      node.selectable = true;
      node.draggable = true;
    } else {
      node.zIndex = 0;
    }
    node.position = snapPosition(node.position);
    nodes.value.push(node);
    saveHistory();
  }

  function removeNode(nodeId: string) {
    nodes.value.forEach((n) => {
      if (n.parentNode === nodeId) {
        const parent = nodes.value.find((p) => p.id === nodeId);
        if (parent) {
          n.position = {
            x: n.position.x + parent.position.x,
            y: n.position.y + parent.position.y,
          };
        }
        n.parentNode = undefined;
      }
    });

    edges.value = edges.value.filter(
      (e) => e.source !== nodeId && e.target !== nodeId,
    );
    nodes.value = nodes.value.filter((n) => n.id !== nodeId);
    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null;
    }
    saveHistory();
  }

  function updateNodeData(nodeId: string, data: Partial<NodeData>) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.data) {
      node.data = { ...node.data, ...data };
    }
  }

  function updateNodePosition(nodeId: string, position: XYPosition) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node) {
      node.position = snapPosition(position);
    }
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId;
  }

  function addEdge(edge: Edge) {
    edges.value.push(edge);
    saveHistory();
  }

  function removeEdge(edgeId: string) {
    edges.value = edges.value.filter((e) => e.id !== edgeId);
    saveHistory();
  }

  function updateNodeSize(nodeId: string, width: number, height: number) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.data) {
      node.data.properties = {
        ...node.data.properties,
        width,
        height,
      };
    }
  }

  function setNodeParent(nodeId: string, parentId: string | null) {
    const nodeIndex = nodes.value.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) return;

    const node = nodes.value[nodeIndex];

    if (!node) return;
    const currentParentId = node.parentNode;
    if (currentParentId) {
      const oldParent = nodes.value.find((p) => p.id === currentParentId);
      if (oldParent) {
        node.position = {
          x: node.position.x + oldParent.position.x,
          y: node.position.y + oldParent.position.y,
        };
      }
      node.parentNode = undefined;
    }

    if (parentId) {
      const newParent = nodes.value.find((n) => n.id === parentId);
      if (newParent) {
        node.position = {
          x: node.position.x - newParent.position.x,
          y: node.position.y - newParent.position.y,
        };
        node.parentNode = parentId;
      }
    }
    saveHistory();
  }

  function getGroupNodes() {
    return nodes.value.filter((n) => n.type === "group");
  }

  function findGroupAtPosition(
    position: XYPosition,
    excludeNodeId?: string,
  ): Node<NodeData> | null {
    const groups = getGroupNodes();

    for (const group of groups) {
      if (group.id === excludeNodeId) continue;

      const width = group.data?.properties?.width || 250;
      const height = group.data?.properties?.height || 150;

      const bounds = {
        left: group.position.x,
        right: group.position.x + width,
        top: group.position.y,
        bottom: group.position.y + height,
      };

      if (
        position.x >= bounds.left &&
        position.x <= bounds.right &&
        position.y >= bounds.top &&
        position.y <= bounds.bottom
      ) {
        return group;
      }
    }

    return null;
  }

  // Theme
  function setTheme(newTheme: Theme) {
    theme.value = newTheme;
    document.documentElement.setAttribute("data-theme", newTheme);
  }

  function toggleTheme() {
    setTheme(theme.value === "dark" ? "light" : "dark");
  }

  // Export/Import
  function exportToJson(): string {
    return JSON.stringify(
      {
        nodes: nodes.value.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
          parentNode: n.parentNode,
          zIndex: n.zIndex,
        })),
        edges: edges.value.map((e) => ({
          id: e.id,
          source: e.source,
          sourceHandle: e.sourceHandle,
          target: e.target,
          targetHandle: e.targetHandle,
        })),
      },
      null,
      2,
    );
  }

  function importFromJson(json: string) {
    try {
      const data = JSON.parse(json);
      nodes.value = data.nodes || [];
      edges.value = data.edges || [];
      selectedNodeId.value = null;
      saveHistory();
      return true;
    } catch (e) {
      console.error("Import failed:", e);
      return false;
    }
  }

  function serialize() {
    return {
      nodes: nodes.value.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        parentNode: n.parentNode,
        zIndex: n.zIndex,
      })),
      edges: edges.value.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle,
      })),
    };
  }

  function deserialize(data: { nodes: Node<NodeData>[]; edges: Edge[] }) {
    nodes.value = data.nodes;
    edges.value = data.edges;
  }

  // 초기화
  initHistory();

  return {
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    // Undo/Redo
    canUndo,
    canRedo,
    undo,
    redo,
    saveHistory,
    // Theme
    theme,
    setTheme,
    toggleTheme,
    // Snap
    snapToGrid,
    gridSize,
    snapPosition,
    // Actions
    addNode,
    removeNode,
    updateNodeData,
    updateNodePosition,
    updateNodeSize,
    setNodeParent,
    getGroupNodes,
    findGroupAtPosition,
    selectNode,
    addEdge,
    removeEdge,
    // Export/Import
    exportToJson,
    importFromJson,
    serialize,
    deserialize,
  };
}
