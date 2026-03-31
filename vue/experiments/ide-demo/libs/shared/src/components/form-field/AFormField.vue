<template>
  <!-- float 모드 -->
  <FloatLabel
    v-if="labelPosition === 'float'"
    variant="on"
    class="max-[640px]:col-span-1"
  >
    <slot />
    <label>
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
  </FloatLabel>

  <!-- vertical / horizontal 모드 -->
  <div
    v-else
    :class="[
      'max-[640px]:col-span-1 flex',
      labelPosition === 'vertical' ? 'flex-col gap-1' : 'items-center gap-2',
    ]"
  >
    <label
      v-if="label"
      class="a-label whitespace-nowrap"
      :style="{
        width: labelPosition === 'horizontal' ? labelWidth : undefined,
      }"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div
      :class="[
        labelPosition === 'horizontal' ? 'flex-1' : 'w-full',
        'flex flex-col gap-1',
      ]"
    >
      <slot />
      <small v-if="helpText" class="text-xs text-surface-400">
        {{ helpText }}
      </small>
      <small v-if="errorMessage" class="text-xs text-red-500">
        {{ errorMessage }}
      </small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FloatLabel } from "primevue";
import type { LabelProps } from "../../types/form";

interface AFormFieldProps extends LabelProps {
  /** 입력 가이드 텍스트 */
  helpText?: string;
  /** 유효성 검사 에러 메시지 */
  errorMessage?: string;
}

withDefaults(defineProps<AFormFieldProps>(), {
  labelPosition: "float",
  labelWidth: "120px",
  required: false,
});
</script>
