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
        <Pie ref="chartRef" :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Pie } from 'vue-chartjs'
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
  { bg: 'rgba(255, 99, 132, 0.2)', border: 'rgba(255, 99, 132, 1)' }, // 빨강
  { bg: 'rgba(54, 162, 235, 0.2)', border: 'rgba(54, 162, 235, 1)' }, // 파랑
  { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgba(75, 192, 192, 1)' }, // 청록
  { bg: 'rgba(153, 102, 255, 0.2)', border: 'rgba(153, 102, 255, 1)' }, // 보라
  { bg: 'rgba(255, 159, 64, 0.2)', border: 'rgba(255, 159, 64, 1)' }, // 오렌지
  { bg: 'rgba(75, 192, 75, 0.2)', border: 'rgba(75, 192, 75, 1)' }, // 녹색
  { bg: 'rgba(25, 25, 112, 0.2)', border: 'rgba(25, 25, 112, 1)' } // 남색
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

const chartData = computed<ChartData<'pie'>>(() => {
  const datasets = props.datasets.map((ds: any, dsIndex: number) => {
    // 배경색 배열이 없으면 labels.length만큼 랜덤 배열 생성
    const bgColors = props.labels.map((_, sliceIndex: number) => {
      const randomColor = getRandomColor(dsIndex * props.labels.length + sliceIndex)
      return randomColor.bg
    })

    // borderColor 배열 생성 (배경색 기반 불투명 버전)
    const borderColors = bgColors.map((color: string) => {
      // rgba 0.2 → 1로 변환, hex는 그대로 또는 불투명 처리
      if (color.includes('rgba')) {
        return color.replace(/0\.2$/, '1')
      } else {
        return color // hex 그대로 (Chart.js가 불투명으로 처리)
      }
    })

    return {
      ...ds,
      backgroundColor: bgColors,
      borderColor: borderColors,
      borderWidth: 1
    }
  })
  return {
    labels: props.labels,
    datasets
  }
})

const chartOptions = reactive<ChartOptions<'pie'>>({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'left' as const // 범례를 왼쪽으로 배치
    }
  }
})
</script>
