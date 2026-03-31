<template>
  <AFormField
    :label="label"
    :labelPosition="labelPosition"
    :labelWidth="labelWidth"
    :required="required"
    :helpText="helpText"
    :errorMessage="errorMessage"
  >
    <InputText
      class="a-input w-full h-9 text-sm"
      :class="customClass"
      :style="customStyle"
      :type="type"
      :variant="variant"
      :fluid="fluid"
      :invalid="invalid"
      :disabled="disabled"
      :readonly="readonly"
      :placeholder="labelPosition === 'float' ? undefined : placeholder"
      v-model="model"
      @keydown.enter="emit('enter')"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
  </AFormField>
</template>

<script setup lang="ts">
import { InputText } from "primevue";
import AFormField from "../form-field/AFormField.vue";
import type { BaseInputProps } from "../../types/form";

export interface AInputTextProps extends BaseInputProps {
  /** 인풋 타입 */
  type?: string;
  /** PrimeVue 인풋 스타일 변형 */
  variant?: "outlined" | "filled";
}

withDefaults(defineProps<AInputTextProps>(), {
  labelPosition: "float",
  labelWidth: "120px",
  type: "text",
  disabled: false,
  readonly: false,
  invalid: false,
  required: false,
  fluid: false,
});

const model = defineModel<string | null | undefined>();

const emit = defineEmits<{
  enter: [];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}>();
</script>
