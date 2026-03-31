<template>
  <Button
    class="a-button"
    :label="label"
    :icon="icon"
    :severity="severity"
    :variant="variant"
    :size="size"
    :disabled="disabled"
    :loading="loading"
    :rounded="rounded"
    :raised="raised"
    :iconPos="iconPos"
    :badge="badge"
    :badgeSeverity="badgeSeverity"
    :fluid="fluid"
    @click="emit('click', $event)"
  >
    <template v-if="$slots.default" #default>
      <slot />
    </template>
  </Button>
</template>

<script setup lang="ts">
import { Button } from "primevue";

export interface AButtonProps {
  /** 버튼 텍스트 */
  label?: string;
  /** PrimeIcons 클래스 (예: pi pi-save) */
  icon?: string;
  /** 아이콘 위치 */
  iconPos?: "left" | "right" | "top" | "bottom";
  /** 버튼 색상 테마 */
  severity?:
    | "secondary"
    | "success"
    | "info"
    | "warn"
    | "danger"
    | "contrast"
    | "help";
  /** 버튼 스타일 변형 */
  variant?: "outlined" | "text" | "link";
  /** 버튼 크기 */
  size?: "small" | "large";
  /** 비활성화 */
  disabled?: boolean;
  /** 로딩 스피너 표시 */
  loading?: boolean;
  /** 둥근 모서리 */
  rounded?: boolean;
  /** 그림자 효과 */
  raised?: boolean;
  /** 부모 너비에 맞춤 */
  fluid?: boolean;
  /** 뱃지 텍스트 */
  badge?: string;
  /** 뱃지 색상 */
  badgeSeverity?:
    | "secondary"
    | "info"
    | "success"
    | "warn"
    | "danger"
    | "contrast";
}

withDefaults(defineProps<AButtonProps>(), {
  disabled: false,
  loading: false,
  rounded: false,
  raised: false,
  fluid: false,
  iconPos: "left",
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();
</script>
