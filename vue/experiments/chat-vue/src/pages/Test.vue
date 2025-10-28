<template>
  <div class="h-full pt-4 pl-36 flex flex-col gap-4 overflow-auto py-5">
    <BarChart :labels="labels" :datasets="datasets" />
    <PieChart :labels="labels" :datasets="pieData" />
    <DataTable :columns="columns" :rows="rows" />
    <LineChart
      :labels="['1월', '2월', '3월', '4월', '5월']"
      :datasets="[
        {
          label: '생산량',
          data: [120, 150, 180, 140, 200]
        },
        {
          label: '목표량',
          data: [100, 120, 150, 160, 180]
        }
      ]"
    />
    <MixedChart
      :labels="['1월', '2월', '3월', '4월', '5월']"
      :datasets="[
        {
          label: '생산량 (개)',
          data: [1200, 1500, 1800, 1400, 2000]
          // type 지정 안 하면 bar
        },
        {
          type: 'line',
          label: '불량률 (%)',
          data: [2.5, 1.8, 2.2, 3.1, 1.5]
        }
      ]"
    />
    <MixedChart
      :labels="['08:00', '09:00', '10:00', '11:00', '12:00']"
      :datasets="[
        {
          label: '실제 생산량',
          data: [120, 150, 180, 140, 200]
        },
        {
          label: '목표 생산량',
          data: [150, 150, 150, 150, 150]
        },
        {
          type: 'line',
          label: '가동률 (%)',
          data: [85, 92, 88, 78, 95]
        }
      ]"
    />
  </div>
</template>
<script setup lang="ts">
import BarChart from '@/components/messages/data-messages/BarChart.vue'
import DataTable from '@/components/messages/data-messages/DataTable.vue'
import LineChart from '@/components/messages/data-messages/LineChart.vue'
import MixedChart from '@/components/messages/data-messages/MixedChart.vue'
import PieChart from '@/components/messages/data-messages/PieChart.vue'

const labels = ['라인 A', '라인 B', '라인 C', '라인 D'] // MES: 생산 라인별

const datasets = [
  {
    label: '생산량 (개)',
    data: [1200, 950, 1500, 800] // 각 라인별 생산된 제품 수
  },
  {
    label: '불량률 (%)',
    data: [2, 1.8, 3.2, 4.1] // 각 라인별 불량 비율 (백분율로 표시)
  },
  {
    label: '가동률 (%)',
    data: [95, 88, 92, 85] // 각 라인별 가동 비율
  }
]

const pieData = [
  {
    data: [1200, 940, 200, 400]
  }
]

const columns = [
  {
    field: 'brand',
    header: '브랜드',
    sortable: true
  },
  {
    field: 'sales',
    header: '판매량',
    sortable: true
  }
]

const rows = [
  {
    brand: 'Samsung',
    sales: 1500000
  },
  {
    brand: 'Apple',
    sales: 1200000
  },
  {
    brand: 'Google',
    sales: 900000
  },
  {
    brand: 'Samsung',
    sales: 1500000
  },
  {
    brand: 'Apple',
    sales: 1200000
  },
  {
    brand: 'Google',
    sales: 900000
  },
  {
    brand: 'Samsung',
    sales: 1500000
  },
  {
    brand: 'Apple',
    sales: 1200000
  },
  {
    brand: 'Google',
    sales: 900000
  }
]
</script>
