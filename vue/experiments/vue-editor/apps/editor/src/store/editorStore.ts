import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Node, EditorNode } from "@vue-editor/core";
import {
  createNode,
  findNodeById,
  insertNode,
  removeNode,
} from "@vue-editor/core";

export const useEditorStore = defineStore("editor", () => {
  const rootNodes = ref<Node[]>([]);
  const selectedNodeId = ref<string | null>(null);

  const selectedNode = computed(() => {
    return selectedNodeId.value
      ? findNodeById(rootNodes.value, selectedNodeId.value)
      : null;
  });

  function addNode(parentId: string | null, slot: string, newNode: Node) {
    if (!parentId) {
      rootNodes.value.push(newNode);
    } else {
      const parent = findNodeById(rootNodes.value, parentId) as EditorNode;
      if (parent && parent.type !== "text") {
        insertNode(parent, slot, newNode);
      }
    }
    selectedNodeId.value = newNode.id;
  }

  function deleteSelectedNode() {
    if (!selectedNodeId.value) return;

    const id = selectedNodeId.value;

    function removeNodeById(id: string, nodes: Node[]): boolean {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.id === id) {
          nodes.splice(i, 1);
          return true;
        }
        if (node.type !== "text" && "children" in node) {
          for (const slot in node.children) {
            if (removeNodeById(id, node.children[slot])) {
              return true;
            }
          }
        }
      }
      return false;
    }

    removeNodeById(id, rootNodes.value);
    selectedNodeId.value = null;
  }

  function removeNodeByIndex(
    parentId: string | null,
    slot: string,
    index: number
  ) {
    if (!parentId) {
      rootNodes.value.splice(index, 1);
    } else {
      const parent = findNodeById(rootNodes.value, parentId) as EditorNode;
      if (parent && parent.type !== "text") {
        removeNode(parent, slot, index);
      }
    }
    if (
      selectedNodeId.value &&
      findNodeById(rootNodes.value, selectedNodeId.value) == null
    ) {
      selectedNodeId.value = null;
    }
  }

  function selectNode(nodeId: string) {
    selectedNodeId.value = nodeId;
  }

  function updateProp(nodeId: string, propName: string, value: any) {
    const node = findNodeById(rootNodes.value, nodeId);
    if (node && node.type !== "text") {
      (node as EditorNode).props[propName] = value;
    }
  }

  function moveNode(
    parentId: string,
    slot: string,
    fromIndex: number,
    toIndex: number
  ) {
    const parent = findNodeById(rootNodes.value, parentId) as EditorNode;
    if (parent && parent.type !== "text") {
      const slotArray = parent.children[slot];
      const [moved] = slotArray.splice(fromIndex, 1);
      slotArray.splice(toIndex, 0, moved);
    }
  }

  return {
    rootNodes,
    selectedNodeId,
    selectedNode,
    addNode,
    removeNodeByIndex,
    selectNode,
    updateProp,
    moveNode,
    deleteSelectedNode,
  };
});
