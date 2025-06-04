export interface EditorNode {
  id: string;
  type: string;
  props: Record<string, any>;
  class?: string;
  style?: Record<string, string>;
  children: Record<string, Node[]>; // key: slot name, value: children
}

export interface TextNode {
  id: string;
  type: "text";
  content: string;
}

export function isTextNode(node: Node): node is TextNode {
  return node.type === "text";
}

export function isEditorNode(node: Node): node is EditorNode {
  return node.type !== "text";
}

export type Node = EditorNode | TextNode;
