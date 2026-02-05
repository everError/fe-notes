// 그룹 색상 팔레트
export const GROUP_COLORS = [
  { value: "#1e3a5f", label: "Blue" },
  { value: "#4338ca", label: "Indigo" },
  { value: "#047857", label: "Emerald" },
  { value: "#b45309", label: "Amber" },
  { value: "#b91c1c", label: "Red" },
  { value: "#7c3aed", label: "Violet" },
  { value: "#0891b2", label: "Cyan" },
  { value: "#be185d", label: "Pink" },
] as const;

export const GROUP_COLOR_VALUES = GROUP_COLORS.map((c) => c.value);

export function getRandomGroupColor(): string {
  return GROUP_COLOR_VALUES[
    Math.floor(Math.random() * GROUP_COLOR_VALUES.length)
  ]!;
}

// 상태별 색상
export const STATUS_COLORS: Record<string, string> = {
  normal: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  offline: "#64748b",
};

// 상태 설정
export const STATUS_CONFIG = {
  normal: { color: "#10b981", label: "Normal", icon: "●" },
  warning: { color: "#f59e0b", label: "Warning", icon: "▲" },
  error: { color: "#ef4444", label: "Error", icon: "■" },
  offline: { color: "#64748b", label: "Offline", icon: "○" },
} as const;

// 기본값
export const DEFAULTS = {
  nodeWidth: 250,
  nodeHeight: 150,
  minNodeWidth: 150,
  minNodeHeight: 100,
  gridSize: 20,
  maxHistory: 50,
} as const;
