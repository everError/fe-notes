import { EditorNode, isEditorNode, Node } from "./types";
import { getComponentMeta } from "@vue-editor/schema";
import { nanoid } from "nanoid";

export function createNode(type: string): EditorNode {
  const meta = getComponentMeta(type);
  if (!meta) throw new Error(`Unknown component type: ${type}`);
  const children: Record<string, Node[]> = {};
  for (const slot of meta.slots) {
    children[slot] = [];
  }
  const props: Record<string, any> = {};
  for (const prop of meta.props) {
    props[prop.name] = prop.default;
  }
  return {
    id: nanoid(),
    type,
    props,
    children,
  };
}
export function findNodeById(tree: Node[], id: string): Node | null {
  for (const node of tree) {
    if (node.id === id) return node;

    if (isEditorNode(node)) {
      for (const slot in node.children) {
        const found = findNodeById(node.children[slot], id);
        if (found) return found;
      }
    }
  }
  return null;
}

export function insertNode(
  parent: EditorNode,
  slotName: string,
  newNode: Node,
  position?: number
) {
  const arr = parent.children[slotName] || [];
  if (position !== undefined) {
    arr.splice(position, 0, newNode);
  } else {
    arr.push(newNode);
  }
  parent.children[slotName] = arr;
}

export function removeNode(
  parent: EditorNode,
  slotName: string,
  index: number
) {
  if (!parent.children[slotName]) return;
  parent.children[slotName].splice(index, 1);
}
