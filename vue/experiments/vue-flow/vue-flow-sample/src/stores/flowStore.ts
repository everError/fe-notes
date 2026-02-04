import { ref, computed } from "vue";
import type { Node, Edge, XYPosition } from "@vue-flow/core";
import type { NodeData } from "../types";

const nodes = ref<Node<NodeData>[]>([]);
const edges = ref<Edge[]>([]);
const selectedNodeId = ref<string | null>(null);

export function useFlowStore() {
  const selectedNode = computed(
    () => nodes.value.find((n) => n.id === selectedNodeId.value) || null,
  );

  function addNode(node: Node<NodeData>) {
    // 그룹 노드는 zIndex를 낮게 설정하여 뒤에 배치
    if (node.type === "group") {
      node.zIndex = -1;
    }
    nodes.value.push(node);
  }

  function removeNode(nodeId: string) {
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
        n.extent = undefined;
        n.expandParent = undefined;
      }
    });

    edges.value = edges.value.filter(
      (e) => e.source !== nodeId && e.target !== nodeId,
    );
    nodes.value = nodes.value.filter((n) => n.id !== nodeId);
    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null;
    }
  }

  function updateNodeData(nodeId: string, data: Partial<NodeData>) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.data) {
      node.data = { ...node.data, ...data };
    }
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId;
  }

  function addEdge(edge: Edge) {
    edges.value.push(edge);
  }

  function removeEdge(edgeId: string) {
    edges.value = edges.value.filter((e) => e.id !== edgeId);
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

  function setNodeParent(
    nodeId: string,
    parentId: string,
    relativePosition: XYPosition,
  ) {
    const node = nodes.value.find((n) => n.id === nodeId);
    const parent = nodes.value.find((n) => n.id === parentId);

    if (node && parent) {
      node.parentNode = parentId;
      // extent를 배열로 설정하여 좌/상단은 제한, 우/하단은 무제한
      // [좌상단 제한, 우하단 제한]
      node.extent = [
        [0, 30],
        [Infinity, Infinity],
      ]; // 30은 헤더 높이
      node.expandParent = false; // 부모 확장 비활성화
      node.position = relativePosition;
      node.zIndex = 0; // 그룹보다 위에 표시
    }
  }

  function removeNodeFromParent(nodeId: string) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.parentNode) {
      const parent = nodes.value.find((p) => p.id === node.parentNode);
      if (parent) {
        node.position = {
          x: node.position.x + parent.position.x,
          y: node.position.y + parent.position.y,
        };
      }
      node.parentNode = undefined;
      node.extent = undefined;
      node.expandParent = undefined;
    }
  }

  // 그룹 노드 목록 반환
  function getGroupNodes() {
    return nodes.value.filter((n) => n.type === "group");
  }

  // 특정 위치가 그룹 내부인지 확인
  function findGroupAtPosition(
    position: XYPosition,
    excludeNodeId?: string,
  ): Node<NodeData> | null {
    const groups = getGroupNodes();

    for (const group of groups) {
      const width = group.data?.properties?.width || 250;
      const height = group.data?.properties?.height || 150;

      const bounds = {
        left: group.position.x,
        right: group.position.x + width,
        top: group.position.y + 30, // 헤더 높이
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

  return {
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    addNode,
    removeNode,
    updateNodeData,
    updateNodeSize,
    setNodeParent,
    removeNodeFromParent,
    getGroupNodes,
    findGroupAtPosition,
    selectNode,
    addEdge,
    removeEdge,
    serialize,
    deserialize,
  };
}
