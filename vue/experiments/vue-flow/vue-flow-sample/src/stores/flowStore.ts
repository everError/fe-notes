import { ref, computed } from "vue";
import type { Node, Edge, XYPosition } from "@vue-flow/core";
import type { NodeData, HistoryState, Theme, SerializedFlowData } from "../types";
import { DEFAULTS } from "../constants";

// 상태
const nodes = ref<Node<NodeData>[]>([]);
const edges = ref<Edge[]>([]);
const selectedNodeId = ref<string | null>(null);

// Undo/Redo
const history = ref<HistoryState[]>([]);
const historyIndex = ref(-1);
const isUndoRedo = ref(false);

// 설정
const theme = ref<Theme>("dark");
const snapToGrid = ref(true);
const gridSize = ref(DEFAULTS.gridSize);

export function useFlowStore() {
  // Computed
  const selectedNode = computed(
    () => nodes.value.find((n) => n.id === selectedNodeId.value) || null
  );

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  const groupNodes = computed(() =>
    nodes.value.filter((n) => n.type === "group")
  );

  // ==================== 히스토리 ====================

  function saveHistory(): void {
    if (isUndoRedo.value) return;

    const state: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes.value)),
      edges: JSON.parse(JSON.stringify(edges.value)),
    };

    history.value = history.value.slice(0, historyIndex.value + 1);
    history.value.push(state);

    if (history.value.length > DEFAULTS.maxHistory) {
      history.value.shift();
    } else {
      historyIndex.value++;
    }
  }

  function undo(): void {
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

  function redo(): void {
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

  function initHistory(): void {
    history.value = [{ nodes: [], edges: [] }];
    historyIndex.value = 0;
  }

  // ==================== 그리드 ====================

  function snapPosition(position: XYPosition): XYPosition {
    if (!snapToGrid.value) return position;
    return {
      x: Math.round(position.x / gridSize.value) * gridSize.value,
      y: Math.round(position.y / gridSize.value) * gridSize.value,
    };
  }

  // ==================== 노드 관리 ====================

  function addNode(node: Node<NodeData>): void {
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

  function removeNode(nodeId: string): void {
    // 자식 노드들의 부모 해제
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

    // 관련 엣지 삭제
    edges.value = edges.value.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );

    // 노드 삭제
    nodes.value = nodes.value.filter((n) => n.id !== nodeId);

    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null;
    }
    saveHistory();
  }

  function updateNodeData(nodeId: string, data: Partial<NodeData>): void {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.data) {
      node.data = { ...node.data, ...data };
    }
  }

  function updateNodePosition(nodeId: string, position: XYPosition): void {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node) {
      node.position = snapPosition(position);
    }
  }

  function updateNodeSize(nodeId: string, width: number, height: number): void {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.data) {
      node.data.properties = {
        ...node.data.properties,
        width,
        height,
      };
    }
  }

  function selectNode(nodeId: string | null): void {
    selectedNodeId.value = nodeId;
  }

  // ==================== 그룹 관리 ====================

  function setNodeParent(nodeId: string, parentId: string | null): void {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node) return;

    // 기존 부모에서 분리
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

    // 새 부모에 연결
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

    // 선택 상태 리프레시
    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null;
      setTimeout(() => {
        selectedNodeId.value = nodeId;
      }, 0);
    }

    saveHistory();
  }

  function getGroupColor(groupId: string | undefined): string | null {
    if (!groupId) return null;
    const group = nodes.value.find(
      (n) => n.id === groupId && n.type === "group"
    );
    return group?.data?.color || null;
  }

  function findGroupAtPosition(
    position: XYPosition,
    excludeNodeId?: string
  ): Node<NodeData> | null {
    for (const group of groupNodes.value) {
      if (group.id === excludeNodeId) continue;

      const width = (group.data?.properties?.width as number) || DEFAULTS.nodeWidth;
      const height = (group.data?.properties?.height as number) || DEFAULTS.nodeHeight;

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

  // ==================== 엣지 관리 ====================

  function addEdge(edge: Edge): void {
    edges.value.push(edge);
    saveHistory();
  }

  function removeEdge(edgeId: string): void {
    edges.value = edges.value.filter((e) => e.id !== edgeId);
    saveHistory();
  }

  // ==================== 테마 ====================

  function setTheme(newTheme: Theme): void {
    theme.value = newTheme;
    document.documentElement.setAttribute("data-theme", newTheme);
  }

  function toggleTheme(): void {
    setTheme(theme.value === "dark" ? "light" : "dark");
  }

  // ==================== 직렬화 ====================

  function serialize(): SerializedFlowData {
    return {
      nodes: nodes.value.map((n) => ({
        id: n.id,
        type: n.type || "custom",
        position: n.position,
        data: n.data!,
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

  function deserialize(data: SerializedFlowData): void {
    nodes.value = data.nodes as Node<NodeData>[];
    edges.value = data.edges as Edge[];
  }

  function exportToJson(): string {
    return JSON.stringify(serialize(), null, 2);
  }

  function importFromJson(json: string): boolean {
    try {
      const data = JSON.parse(json) as SerializedFlowData;
      deserialize(data);
      selectedNodeId.value = null;
      saveHistory();
      return true;
    } catch (e) {
      console.error("Import failed:", e);
      return false;
    }
  }

  // 초기화
  initHistory();

  return {
    // 상태
    nodes,
    edges,
    selectedNode,
    selectedNodeId,

    // 히스토리
    canUndo,
    canRedo,
    undo,
    redo,
    saveHistory,

    // 테마
    theme,
    setTheme,
    toggleTheme,

    // 그리드
    snapToGrid,
    gridSize,
    snapPosition,

    // 노드
    addNode,
    removeNode,
    updateNodeData,
    updateNodePosition,
    updateNodeSize,
    selectNode,

    // 그룹
    groupNodes,
    setNodeParent,
    getGroupColor,
    findGroupAtPosition,

    // 엣지
    addEdge,
    removeEdge,

    // 직렬화
    serialize,
    deserialize,
    exportToJson,
    importFromJson,
  };
}
