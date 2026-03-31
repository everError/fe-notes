<template>
  <AFormField
    :label="label"
    :labelPosition="labelPosition"
    :labelWidth="labelWidth"
    :required="required"
    :helpText="helpText"
    :errorMessage="errorMessage"
  >
    <InputNumber
      class="a-input w-full h-9 text-sm"
      :class="customClass"
      :style="customStyle"
      :variant="variant"
      :fluid="fluid"
      :invalid="invalid"
      :disabled="disabled"
      :readonly="readonly"
      :placeholder="labelPosition === 'float' ? undefined : placeholder"
      :min="min"
      :max="max"
      :step="step"
      :minFractionDigits="minFractionDigits"
      :maxFractionDigits="maxFractionDigits"
      :prefix="prefix"
      :suffix="suffix"
      :currency="currency"
      :mode="mode"
      :locale="locale"
      :useGrouping="useGrouping"
      :showButtons="showButtons"
      :buttonLayout="buttonLayout"
      v-model="model"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
  </AFormField>
</template>

<script setup lang="ts">
import { InputNumber } from "primevue";
import AFormField from "../form-field/AFormField.vue";
import type { BaseInputProps } from "../../types/form";

export interface AInputNumberProps extends BaseInputProps {
  /** PrimeVue 인풋 스타일 변형 */
  variant?: "outlined" | "filled";
  /** 최솟값 */
  min?: number;
  /** 최댓값 */
  max?: number;
  /** 증감 단위 */
  step?: number;
  /** 최소 소수점 자릿수 */
  minFractionDigits?: number;
  /** 최대 소수점 자릿수 */
  maxFractionDigits?: number;
  /** 접두사 (예: '$') */
  prefix?: string;
  /** 접미사 (예: 'kg') */
  suffix?: string;
  /** 통화 코드 (mode='currency' 시). ISO 4217 코드 (예: 'KRW', 'USD') */
  currency?: string;
  /** 숫자 포맷 모드 */
  mode?: "decimal" | "currency";
  /** 로케일 (예: 'ko-KR') */
  locale?: string;
  /** 천 단위 구분자 표시 */
  useGrouping?: boolean;
  /** 증감 버튼 표시 */
  showButtons?: boolean;
  /** 버튼 배치 */
  buttonLayout?: "stacked" | "horizontal" | "vertical";
}

withDefaults(defineProps<AInputNumberProps>(), {
  labelPosition: "float",
  labelWidth: "120px",
  disabled: false,
  readonly: false,
  invalid: false,
  required: false,
  fluid: false,
  useGrouping: true,
  showButtons: false,
  buttonLayout: "stacked",
  mode: "decimal",
});

const model = defineModel<number | null | undefined>();

const emit = defineEmits<{
  focus: [event: Event];
  blur: [event: Event];
}>();
</script>
