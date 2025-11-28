import { ref, computed, onMounted, onUnmounted, nextTick, type Ref } from 'vue'
import type { MarkdownBlock } from '@/defines/markdown'

interface VirtualScrollerOptions {
  containerRef: Ref<HTMLElement | null>
  blocks: Ref<MarkdownBlock[]>
  estimatedBlockHeight?: number
  overscan?: number
}

interface BlockMeasurement {
  height: number
  top: number
}

export function useVirtualScroller(options: VirtualScrollerOptions) {
  const { containerRef, blocks, estimatedBlockHeight = 100, overscan = 3 } = options

  const scrollTop = ref(0)
  const containerHeight = ref(0)
  const measurements = ref<Map<string, BlockMeasurement>>(new Map())

  const blockPositions = computed(() => {
    const positions: { id: string; top: number; height: number }[] = []
    let currentTop = 0

    for (const block of blocks.value) {
      const measured = measurements.value.get(block.id)
      const height = measured?.height ?? estimatedBlockHeight

      positions.push({
        id: block.id,
        top: currentTop,
        height
      })

      currentTop += height
    }

    return positions
  })

  const totalHeight = computed(() => {
    if (blockPositions.value.length === 0) return 0
    const last = blockPositions.value[blockPositions.value.length - 1]
    return last.top + last.height
  })

  const visibleBlocks = computed(() => {
    const start = scrollTop.value
    const end = start + containerHeight.value

    const visible: { block: MarkdownBlock; style: { top: string } }[] = []

    for (let i = 0; i < blockPositions.value.length; i++) {
      const pos = blockPositions.value[i]
      const blockEnd = pos.top + pos.height

      const isVisible =
        blockEnd >= start - overscan * estimatedBlockHeight &&
        pos.top <= end + overscan * estimatedBlockHeight

      if (isVisible) {
        visible.push({
          block: blocks.value[i],
          style: { top: `${pos.top}px` }
        })
      }
    }

    return visible
  })

  function measureBlock(blockId: string, element: HTMLElement) {
    if (!element) return

    // measure after layout stabilized
    requestAnimationFrame(() => {
      const height = Math.ceil(element.getBoundingClientRect().height) // 소수점 방지
      const existing = measurements.value.get(blockId)

      if (!existing || existing.height !== height) {
        // 업데이트: Map에 set 한 뒤 **참조를 교체**해서 컴퓨티드 트리거
        const next = new Map(measurements.value)
        next.set(blockId, { height, top: existing?.top ?? 0 })
        measurements.value = next
      }
    })
  }
  // --------------------------------

  // scroll / resize 로직은 동일
  function handleScroll(event: Event) {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
  }

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    if (!containerRef.value) return

    containerHeight.value = containerRef.value.clientHeight

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height
      }
    })

    resizeObserver.observe(containerRef.value)
    containerRef.value.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
    containerRef.value?.removeEventListener('scroll', handleScroll)
  })

  function scrollToBlock(blockId: string, behavior: ScrollBehavior = 'smooth') {
    const pos = blockPositions.value.find((p) => p.id === blockId)
    if (pos && containerRef.value) {
      containerRef.value.scrollTo({ top: pos.top, behavior })
    }
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    if (containerRef.value) {
      containerRef.value.scrollTo({
        top: totalHeight.value,
        behavior
      })
    }
  }

  return {
    visibleBlocks,
    totalHeight,
    scrollTop,
    measureBlock,
    scrollToBlock,
    scrollToBottom
  }
}
