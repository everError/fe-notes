<template>
  <div class="max-w-3xl bg-white border-gray-100 border shadow-sm rounded-4xl p-4">
    <div class="flex justify-end items-center mb-4">
      <Button
        icon="pi pi-download"
        class="p-button-text p-button-sm"
        @click="exportToCSV"
      />
    </div>
    <DataTable
      ref="dt"
      :value="rows"
      :virtualScrollerOptions="{ itemSize: 34 }"
      scrollable
      scrollHeight="320px"
      responsiveLayout="scroll"
      class="text-xs"
    >
      <Column
        v-for="col in columns"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        :sortable="col.sortable ?? true"
      />
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'

interface ColumnConfig {
  field: string
  header: string
  sortable?: boolean
  filter?: boolean
}

interface DataTableProps {
  columns: ColumnConfig[]
  rows: any[]
}
defineProps<DataTableProps>()
const dt = ref() // DataTable ref

const exportToCSV = () => {
  // PrimeVue DataTable의 기본 exportCSV 사용 (설정된 columns와 rows 기반)
  dt.value?.exportCSV()
}

// CSS로 글자 크기 추가 (scoped 스타일)
</script>
