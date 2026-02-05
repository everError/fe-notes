import type { Node, Edge, NodeProps as VueFlowNodeProps } from "@vue-flow/core";

// 상태 타입
export type NodeStatus = "normal" | "warning" | "error" | "offline";
export type Theme = "dark" | "light";

// 노드 데이터 인터페이스
export interface NodeData {
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  properties?: Record<string, unknown>;
  status?: NodeStatus;
  value?: number;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  animated?: boolean;
}

// 노드 템플릿 (팔레트용)
export interface NodeTemplate {
  type: string;
  label: string;
  icon: string;
  color: string;
  category?: string;
  defaultProperties?: Record<string, unknown>;
}

// 히스토리 상태
export interface HistoryState {
  nodes: Node<NodeData>[];
  edges: Edge[];
}

// 노드 Props 타입 (Vue Flow에서 제공하는 것 확장)
export type NodeProps = VueFlowNodeProps<NodeData>;

// 컨텍스트 메뉴 아이템
export interface MenuItem {
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
}

// 직렬화된 데이터
export interface SerializedFlowData {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: NodeData;
    parentNode?: string;
    zIndex?: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    sourceHandle?: string | null;
    target: string;
    targetHandle?: string | null;
  }>;
}
