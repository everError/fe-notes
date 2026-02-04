export interface NodeData {
  label: string;
  description: string;
  color: string;
  icon: string;
  properties: Record<string, any>;
  // 확장 속성
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
