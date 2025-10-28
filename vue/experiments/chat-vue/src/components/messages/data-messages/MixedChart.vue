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
        <Bar ref="chartRef" :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bar } from 'vue-chartjs'
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

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.labels,
  datasets: props.datasets.map((ds: any, index: number) => {
    const randomColor = getRandomColor(index)

    // type이 'line'이면 선 그래프로, 없으면 막대 그래프로
    const isLine = ds.type === 'line'

    return {
      ...ds,
      type: ds.type || 'bar', // 기본값은 'bar'
      backgroundColor: randomColor.bg,
      borderColor: randomColor.border,
      borderWidth: isLine ? 2 : 1,
      // 선 그래프 전용 옵션
      ...(isLine && {
        tension: 0.4,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1' // 오른쪽 y축 사용
      }),
      // 막대 그래프는 왼쪽 y축 사용
      ...(!isLine && {
        yAxisID: 'y'
      })
    }
  })
}))

const chartOptions = reactive<ChartOptions<'bar'>>({
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
    mode: 'index' as const,
    intersect: false
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      title: {
        display: false
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)'
      },
      beginAtZero: true
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      title: {
        display: false
      },
      grid: {
        drawOnChartArea: false // y1 그리드는 차트에 표시 안 함
      },
      beginAtZero: true
    }
  }
})
</script>
