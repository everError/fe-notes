<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useMarkdownParser } from '@/composables/useMarkdownParser'
import { useCodeHighlighter } from '@/composables/useCodeHighlighter'
import { useVirtualScroller } from '@/composables/useVirtualScroller'
import MarkdownBlock from './MarkdownBlock.vue'
import type { MarkdownBlock as MarkdownBlockType } from '@/defines/markdown'

const props = withDefaults(
  defineProps<{
    content: string
    streaming?: boolean
    autoScroll?: boolean
    virtualScroll?: boolean
    virtualScrollThreshold?: number
  }>(),
  {
    streaming: false,
    autoScroll: true,
    virtualScroll: true,
    virtualScrollThreshold: 50
  }
)

const emit = defineEmits<{
  rendered: []
  streamEnd: []
}>()

const parser = useMarkdownParser()
const highlighter = useCodeHighlighter()

const containerRef = ref<HTMLElement | null>(null)
const blocks = ref<MarkdownBlockType[]>([])
const isRendering = ref(false)
const lastContent = ref('')

const useVirtual = computed(
  () => props.virtualScroll && blocks.value.length > props.virtualScrollThreshold
)

const virtualScroller = useVirtualScroller({
  containerRef,
  blocks,
  estimatedBlockHeight: 80,
  overscan: 5
})

const displayBlocks = computed(() => {
  if (useVirtual.value) {
    return virtualScroller.visibleBlocks.value
  }
  return blocks.value.map((block) => ({ block, style: {} }))
})

async function processContent(content: string) {
  if (!content || content === lastContent.value) return

  isRendering.value = true
  lastContent.value = content

  const parsedBlocks = parser.parseContent(content)
  blocks.value = parsedBlocks

  await nextTick()

  await highlighter.highlightBlocksAsync(parsedBlocks, (blockId, html) => {
    const index = blocks.value.findIndex((b) => b.id === blockId)
    if (index !== -1) {
      blocks.value[index] = {
        ...blocks.value[index],
        html,
        highlighted: true
      }
    }
  })

  isRendering.value = false
  emit('rendered')
}

async function processStreamChunk(chunk: string) {
  const { newBlocks, updatedLastBlock } = parser.parseStreamChunk(chunk)

  if (updatedLastBlock && blocks.value.length > 0) {
    blocks.value[blocks.value.length - 1] = updatedLastBlock
  }

  if (newBlocks.length > 0) {
    blocks.value.push(...newBlocks)

    await nextTick()
    await highlighter.highlightBlocksAsync(newBlocks, (blockId, html) => {
      const index = blocks.value.findIndex((b) => b.id === blockId)
      if (index !== -1) {
        blocks.value[index] = {
          ...blocks.value[index],
          html,
          highlighted: true
        }
      }
    })
  }

  if (props.autoScroll) {
    await nextTick()
    virtualScroller.scrollToBottom('auto')
  }
}

async function endStream() {
  const lastBlock = parser.flushBuffer()
  if (lastBlock) {
    blocks.value.push(lastBlock)

    if (lastBlock.type === 'code') {
      await highlighter.highlightBlocksAsync([lastBlock], (blockId, html) => {
        const index = blocks.value.findIndex((b) => b.id === blockId)
        if (index !== -1) {
          blocks.value[index] = {
            ...blocks.value[index],
            html,
            highlighted: true
          }
        }
      })
    }
  }

  emit('streamEnd')
}

function handleBlockMeasured(blockId: string, height: number) {
  if (containerRef.value) {
    const el = containerRef.value.querySelector(
      `[data-block-id="${blockId}"]`
    ) as HTMLElement
    if (el) {
      virtualScroller.measureBlock(blockId, el)
    }
  }
}

watch(
  () => props.content,
  (newContent, oldContent) => {
    if (props.streaming) {
      const chunk = newContent.slice(oldContent?.length || 0)
      if (chunk) {
        processStreamChunk(chunk)
      }
    } else {
      processContent(newContent)
    }
  },
  { immediate: true }
)

watch(
  () => props.streaming,
  (streaming, wasStreaming) => {
    if (wasStreaming && !streaming) {
      endStream()
    }
  }
)

onMounted(async () => {
  await highlighter.initHighlighter()
})

onUnmounted(() => {
  highlighter.dispose()
  parser.resetBuffer()
})

defineExpose({
  scrollToTop: () => containerRef.value?.scrollTo({ top: 0, behavior: 'smooth' }),
  scrollToBottom: () => virtualScroller.scrollToBottom(),
  scrollToBlock: virtualScroller.scrollToBlock
})
</script>

<template>
  <div
    ref="containerRef"
    class="markdown-viewer"
    :class="{ 'markdown-viewer--virtual': useVirtual }"
  >
    <div
      v-if="useVirtual"
      class="markdown-viewer__scroll-content"
      :style="{ height: `${virtualScroller.totalHeight.value}px` }"
    >
      <div
        v-for="{ block, style } in displayBlocks"
        :key="block.id"
        :data-block-id="block.id"
        class="markdown-viewer__block"
        :style="{ position: 'absolute', left: 0, right: 0, ...style }"
      >
        <MarkdownBlock
          :block="block"
          @measured="(h) => handleBlockMeasured(block.id, h)"
        />
      </div>
    </div>

    <template v-else>
      <MarkdownBlock
        v-for="{ block } in displayBlocks"
        :key="block.id"
        :block="block"
      />
    </template>

    <div v-if="streaming" class="markdown-viewer__streaming-indicator">
      <span>●</span>
    </div>
  </div>
</template>
