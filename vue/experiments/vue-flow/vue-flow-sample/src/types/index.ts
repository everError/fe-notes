export interface NodeData {
  label: string;
  description: string;
  color: string;
  icon: string;
  properties: Record<string, any>;
  status?: "normal" | "warning" | "error" | "offline";
  value?: number;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  animated?: boolean;
}

export interface NodeTemplate {
  type: string;
  label: string;
  icon: string;
  color: string;
  defaultProperties: Record<string, any>;
  category?: string;
}

export interface HistoryState {
  nodes: any[];
  edges: any[];
}

export type Theme = "dark" | "light";
