<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import DOMPurify from 'dompurify'
import type { MarkdownBlock } from '@/defines/markdown'

const props = defineProps<{
  block: MarkdownBlock
}>()

const emit = defineEmits<{
  measured: [height: number]
}>()

const blockRef = ref<HTMLElement | null>(null)

const sanitizedHtml = computed(() => {
  return DOMPurify.sanitize(props.block.html, {
    ADD_TAGS: ['pre', 'code', 'svg', 'rect', 'path', 'button', 'span'],
    ADD_ATTR: [
      'class',
      'aria-label',
      'viewBox',
      'fill',
      'stroke',
      'stroke-width',
      'd',
      'x',
      'y',
      'width',
      'height',
      'rx',
      'ry'
    ]
  })
})

onMounted(() => {
  if (blockRef.value) {
    emit('measured', blockRef.value.offsetHeight)
  }
})

watch(
  () => props.block.html,
  () => {
    requestAnimationFrame(() => {
      if (blockRef.value) {
        emit('measured', blockRef.value.offsetHeight)
      }
    })
  }
)

// 기존 마크다운 뷰어와 동일한 복사 로직
async function handleClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const btn = target.closest('.copy-btn') as HTMLButtonElement | null

  if (!btn) return

  const wrapper = btn.closest('.code-block-wrapper')
  const codeElement = wrapper?.querySelector('pre code') as HTMLElement | null
  const codeText = codeElement?.innerText || ''

  if (codeText && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(codeText)

      const svg = btn.querySelector('svg')
      const copyText = btn.querySelector('.copy-text') as HTMLElement | null
      const copiedText = btn.querySelector('.copied-text') as HTMLElement | null

      if (svg) svg.style.display = 'none'
      if (copyText) copyText.style.display = 'none'
      if (copiedText) copiedText.style.display = 'inline'

      setTimeout(() => {
        if (svg) svg.style.display = 'block'
        if (copyText) copyText.style.display = 'inline'
        if (copiedText) copiedText.style.display = 'none'
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
}
</script>

<template>
  <div
    ref="blockRef"
    class="markdown-block"
    :class="`markdown-block--${block.type}`"
    @click="handleClick"
    v-html="sanitizedHtml"
  />
</template>
