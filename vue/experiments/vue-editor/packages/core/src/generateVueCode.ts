import type { Node, EditorNode, TextNode } from "./types";

function isTextNode(node: Node): node is TextNode {
  return node.type === "text";
}

function renderProps(props: Record<string, unknown>): string {
  return Object.entries(props)
    .map(([key, value]) => {
      if (typeof value === "string") return `${key}="${value}"`;
      if (typeof value === "boolean") return value ? key : "";
      return `:${key}='${JSON.stringify(value)}'`;
    })
    .filter(Boolean)
    .join(" ");
}

export function generateVueCode(node: Node | Node[]): string {
  const renderNode = (node: Node): string => {
    if (isTextNode(node)) return node.content;

    const { type, props, class: className, style, children } = node;
    const propsStr = renderProps(props);
    const classStr = className ? ` class="${className}"` : "";
    const styleStr = style
      ? ` style="${Object.entries(style)
          .map(([k, v]) => `${k}:${v}`)
          .join(";")}"`
      : "";

    const slots = Object.entries(children)
      .map(([slot, childNodes]) => {
        const rendered = childNodes.map(renderNode).join("");
        return slot === "default"
          ? rendered
          : `<template #${slot}>${rendered}</template>`;
      })
      .join("");

    return `<${type}${
      propsStr ? " " + propsStr : ""
    }${classStr}${styleStr}>${slots}</${type}>`;
  };

  return Array.isArray(node)
    ? node.map(renderNode).join("\n")
    : renderNode(node);
}
