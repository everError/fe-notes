import type { Ref } from 'vue'

/**
 * Chart.js 차트를 PNG 이미지로 내보내기
 * @param chartRef - vue-chartjs 컴포넌트의 ref
 * @param fileName - 다운로드할 파일명 (기본값: chart_타임스탬프)
 * @param backgroundColor - 배경색 (기본값: #ffffff)
 */
export const exportChartToPNG = (
  chartRef: Ref<any>,
  fileName?: string,
  backgroundColor: string = '#ffffff'
) => {
  if (!chartRef.value?.chart) {
    console.error('Chart reference is not available')
    return
  }

  const chart = chartRef.value.chart
  const canvas = chart.canvas

  // 임시 캔버스 생성
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height
  const tempCtx = tempCanvas.getContext('2d')

  if (!tempCtx) {
    console.error('Failed to get canvas context')
    return
  }

  // 배경색 그리기
  tempCtx.fillStyle = backgroundColor
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

  // 원본 차트 이미지 복사
  tempCtx.drawImage(canvas, 0, 0)

  // 다운로드
  const url = tempCanvas.toDataURL('image/png', 1)
  const link = document.createElement('a')
  link.download = fileName || `chart_${new Date().getTime()}.png`
  link.href = url
  link.click()
}
