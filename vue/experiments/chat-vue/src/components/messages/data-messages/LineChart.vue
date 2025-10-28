<template>
  <div class="relative">
    <div
      class="min-h-90 max-w-3xl h-96 bg-white border-gray-100 border shadow-sm rounded-4xl p-4"
    >
      <div class="flex justify-end mb-2">
        <Button
          icon="pi pi-download"
          class="p-button-text p-button-sm"
          @click="exportChart"
        />
      </div>
      <div class="h-[calc(100%-2.5rem)]">
        <Line ref="chartRef" :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { reactive, computed, ref } from 'vue'
import type { ChartData, ChartOptions } from 'chart.js'
import { exportChartToPNG } from '@/utils/chartExport'

const props = defineProps<{
  labels: string[]
  datasets: any[]
}>()

const chartRef = ref()

const exportChart = () => {
  exportChartToPNG(chartRef, 'chart.png')
}

// 색상 팔레트
const colorPalette = [
  { bg: 'rgba(96, 165, 250, 0.2)', border: 'rgba(96, 165, 250, 1)' }, // 라이트 블루
  { bg: 'rgba(134, 239, 172, 0.2)', border: 'rgba(134, 239, 172, 1)' }, // 라이트 그린
  { bg: 'rgba(196, 181, 253, 0.2)', border: 'rgba(196, 181, 253, 1)' }, // 라이트 퍼플
  { bg: 'rgba(253, 186, 116, 0.2)', border: 'rgba(253, 186, 116, 1)' }, // 라이트 오렌지
  { bg: 'rgba(147, 197, 253, 0.2)', border: 'rgba(147, 197, 253, 1)' }, // 스카이
  { bg: 'rgba(110, 231, 183, 0.2)', border: 'rgba(110, 231, 183, 1)' }, // 민트
  { bg: 'rgba(165, 180, 252, 0.2)', border: 'rgba(165, 180, 252, 1)' }, // 인디고 라이트
  { bg: 'rgba(156, 163, 175, 0.2)', border: 'rgba(156, 163, 175, 1)' } // 그레이
]

// 랜덤 섞기 함수
const shufflePalette = (palette: Array<any>) => {
  const shuffled = [...palette]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

let shuffledPalette: Array<any> = [] // 섞인 팔레트 저장 (한 번만 섞음)

const getRandomColor = (index: number) => {
  if (shuffledPalette.length === 0) {
    shuffledPalette = shufflePalette(colorPalette) // 첫 호출 시 섞음
  }
  const paletteIndex = index % shuffledPalette.length
  return shuffledPalette[paletteIndex]
}

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.labels,
  datasets: props.datasets.map((ds: any, index: number) => {
    const randomColor = getRandomColor(index)
    return {
      ...ds,
      backgroundColor: randomColor.bg, // 영역 채우기 색상
      borderColor: randomColor.border, // 선 색상
      borderWidth: 2, // 선 굵기
      tension: 0.4, // 곡선 정도 (0: 직선, 1: 매우 곡선)
      fill: true, // 영역 채우기
      pointRadius: 4, // 점 크기
      pointHoverRadius: 6 // 호버 시 점 크기
    }
  })
}))

const chartOptions = reactive<ChartOptions<'line'>>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const
    },
    title: {
      display: false
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false
    }
  },
  interaction: {
    mode: 'nearest' as const,
    axis: 'x' as const,
    intersect: false
  },
  scales: {
    x: {
      display: true,
      title: {
        display: false
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    y: {
      display: true,
      title: {
        display: false
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)'
      },
      beginAtZero: true
    }
  }
})
</script>
