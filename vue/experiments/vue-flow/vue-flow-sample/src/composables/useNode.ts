import { computed, type ComputedRef } from "vue";
import type { NodeProps, NodeStatus } from "../types";
import { useFlowStore } from "../stores/flowStore";
import { STATUS_COLORS } from "../constants";

export interface UseNodeReturn {
  // 상태
  isSelected: ComputedRef<boolean>;
  hasParent: ComputedRef<boolean>;

  // 그룹 관련
  groupColor: ComputedRef<string | null>;
  nodeStyle: ComputedRef<Record<string, string>>;

  // 값 관련
  percentage: ComputedRef<number>;
  statusColor: ComputedRef<string>;

  // 데이터 접근
  status: ComputedRef<NodeStatus>;
  isAnimated: ComputedRef<boolean>;
}

/**
 * 모든 노드에서 공통으로 사용하는 로직
 */
export function useNode(props: NodeProps): UseNodeReturn {
  const store = useFlowStore();

  // 기본 상태
  const isSelected = computed(() => props.selected ?? false);
  const hasParent = computed(() => !!props.parentNodeId);

  // 그룹 관련
  const groupColor = computed(() => {
    return store.getGroupColor(props.parentNodeId);
  });

  // 노드 스타일 (그룹에 속한 경우 테두리 색상 등)
  const nodeStyle = computed(() => {
    const baseColor = props.data?.color || "#475569";
    const borderColor = isSelected.value
      ? "#6366f1"
      : groupColor.value || baseColor;

    return {
      borderColor,
      "--group-color": groupColor.value || "transparent",
    };
  });

  // 값 퍼센티지 계산
  const percentage = computed(() => {
    const val = props.data?.value ?? 0;
    const min = props.data?.minValue ?? 0;
    const max = props.data?.maxValue ?? 100;
    if (max === min) return 0;
    return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
  });

  // 상태
  const status = computed<NodeStatus>(() => props.data?.status || "normal");

  // 상태 색상
  const statusColor = computed(() => {
    return STATUS_COLORS[status.value] || STATUS_COLORS.normal!;
  });

  // 애니메이션 상태
  const isAnimated = computed(() => {
    return props.data?.animated === true && status.value !== "offline";
  });

  return {
    isSelected,
    hasParent,
    groupColor,
    nodeStyle,
    percentage,
    statusColor,
    status,
    isAnimated,
  };
}
