<template>
  <Select
    v-model="value"
    :options="options"
    optionLabel="name"
    optionValue="code"
    filter
    filterPlaceholder="검색"
    class="w-full h-full"
    :pt="{
      label: {
        style: 'line-height: normal; display:flex; align-items:center;',
      },
    }"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Select } from 'primevue';

/** AG Grid cellEditor params */
const props = defineProps<{ params: any }>();

const value = ref(props.params.value);
const options = ref<any[]>([]);

onMounted(() => {
  options.value = props.params.options ?? [];
});

defineExpose({
  /** AG Grid cellEditor 인터페이스 — 편집 완료 시 값 반환 */
  getValue() {
    return value.value;
  },
});
</script>

<style scoped>
.ag-cell-editing .p-select {
  width: 100% !important;
}
</style>
