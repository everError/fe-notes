<template>
  <ag-grid-vue
    ref="gridRef"
    :grid-options="gridOptions"
    style="height: 80vh"
  ></ag-grid-vue>
</template>
<script lang="ts" setup>
import { AgGridVue } from 'ag-grid-vue3';
import { type GridOptions } from 'ag-grid-community';
import { ref, type ComponentPublicInstance } from 'vue';

const gridRef = ref<ComponentPublicInstance<typeof AgGridVue> | null>(null);
const gridOptions = ref<GridOptions>();
</script>
