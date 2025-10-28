<template>
  <div class="markdown-renderer w-full min-w-0" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { Marked, Renderer } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import { markedHighlight } from 'marked-highlight'
// import 'highlight.js/styles/default.css'
import 'highlight.js/styles/atom-one-light.css'
// import 'highlight.js/styles/vs2015.css'

interface Props {
  content: string
}

const props = defineProps<Props>()

const renderedContent = ref('')

// 별도 highlight 함수 정의 (renderer에서 직접 사용)
const highlightFn = (code: string, lang: string): string => {
  const language = hljs.getLanguage(lang) ? lang : 'plaintext'
  return hljs.highlight(code, { language }).value
}

// Marked 인스턴스 생성: markedHighlight 확장 사용
const markedInstance = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight: highlightFn
  })
)

// 커스텀 renderer: 코드 블록에 헤더(언어 + 복사 버튼) 추가
const renderer = new Renderer()
renderer.code = function ({
  text: code,
  lang: infostring,
  escaped
}: {
  text: string
  lang?: string
  escaped?: boolean
}) {
  const lang = (infostring?.match(/\S*/) ?? ['plaintext'])[0] ?? 'plaintext'
  const highlighted = escaped ? code : highlightFn(code, lang)
  const copyButtonId = `copy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return `
    <div class="code-block-wrapper">
      <div class="copy-panel">
        <button class="copy-btn" data-copy-id="${copyButtonId}" aria-label="Copy code">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span class="copy-text">Copy</span>
          <span class="copied-text" style="display: none;">Copied!</span>
        </button>
      </div>
      <div class="code-header">
        <span class="code-lang">${lang}</span>
        
      </div>
      <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
    </div>
  `
}

// Renderer 적용
markedInstance.use({ renderer })

// 초기 로드
onMounted(async () => {
  const html = await markedInstance.parse(props.content)
  renderedContent.value = DOMPurify.sanitize(html)
  nextTick(() => attachCopyListeners())
})

// content 변경 감지 및 재파싱
watch(
  () => props.content,
  async (newContent) => {
    if (newContent) {
      const html = await markedInstance.parse(newContent)
      renderedContent.value = DOMPurify.sanitize(html)
      nextTick(() => attachCopyListeners())
    } else {
      renderedContent.value = ''
    }
  },
  { immediate: false }
)

// 복사 버튼 이벤트 핸들러
const attachCopyListeners = () => {
  const copyBtns = document.querySelectorAll('.copy-btn')
  copyBtns.forEach((btn) => {
    btn.removeEventListener('click', handleCopy)
    btn.addEventListener('click', handleCopy as EventListener)
  })
}

const handleCopy = async (e: Event) => {
  const event = e as MouseEvent
  const btn = event.currentTarget as HTMLButtonElement
  const wrapper = btn.closest('.code-block-wrapper')
  const codeElement = wrapper?.querySelector('pre code') as HTMLElement | null
  const codeText = codeElement?.innerText || '' // innerText로 순수 텍스트만 추출 (태그 무시)
  if (codeText && navigator.clipboard) {
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
  }
}
</script>

<style scoped>
.markdown-renderer {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
}

.markdown-renderer :deep(h1),
.markdown-renderer :deep(h2),
.markdown-renderer :deep(h3),
.markdown-renderer :deep(h4),
.markdown-renderer :deep(h5),
.markdown-renderer :deep(h6) {
  /* border-bottom: 1px solid #eaecef; */
  padding-bottom: 0.3em;
  font-weight: bold;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.markdown-renderer :deep(h1) {
  font-size: 2em;
}
.markdown-renderer :deep(h2) {
  font-size: 1.5em;
}
.markdown-renderer :deep(h3) {
  font-size: 1.25em;
}
.markdown-renderer :deep(h4) {
  font-size: 1em;
}
.markdown-renderer :deep(h5) {
  font-size: 0.875em;
}
.markdown-renderer :deep(h6) {
  font-size: 0.75em;
}

.markdown-renderer :deep(ul),
.markdown-renderer :deep(ol) {
  list-style-position: outside;
  padding-left: 1.5em;
  margin-bottom: 1em;
}

.markdown-renderer :deep(ul) {
  list-style-type: disc;
}

.markdown-renderer :deep(ol) {
  list-style-type: decimal;
}

.markdown-renderer :deep(li) {
  margin-bottom: 0.5em;
}

.markdown-renderer :deep(code) {
  background-color: #ebeaeae1;
  padding: 0.2em 0.4em;
  border-radius: 8px;
  font-size: 0.8em;
  word-break: break-all;
}

.markdown-renderer :deep(.code-block-wrapper) {
  position: relative;
  margin: 0.4em 0;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.markdown-renderer :deep(.code-header) {
  justify-content: space-between;
  align-items: center;
  background: #f3f4f6;
  padding: 0.5em 1em;
  border-bottom: 1px solid #d1d5db;
  font-size: 0.7em;
  color: #6b7280;
  height: 30px;
  position: relative;
  overflow: visible;
  border-radius: 8px;
}

.markdown-renderer :deep(.code-lang) {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.markdown-renderer :deep(.copy-panel) {
  position: absolute;
  top: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  width: 100%;
  height: 100%;
  padding-right: 0.4em;
  pointer-events: none;
}

.markdown-renderer :deep(.copy-btn) {
  pointer-events: auto;
  position: sticky;
  top: 0.4em;
  right: 0;
  z-index: 10;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.25em;
  padding: 0.25em;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.markdown-renderer :deep(.copy-btn:hover) {
  background-color: #e5e7eb;
}

.markdown-renderer :deep(.copy-text),
.markdown-renderer :deep(.copied-text) {
  font-size: 0.8em;
  font-weight: 500;
}

.markdown-renderer :deep(.copied-text) {
  color: #059669;
}

.markdown-renderer :deep(pre) {
  background: #ffffff;
  border-radius: 0;
  padding: 1em;
  margin: 0;
  scrollbar-width: thin;
  border-radius: 8px;
}

.markdown-renderer :deep(pre code) {
  background: none;
  padding: 0;
  word-break: break-all;
  color: #24292e;
}

.markdown-renderer :deep(blockquote) {
  border-left: 0.25em solid #dfe2e5;
  margin: 0.2em;
  padding-left: 1em;
  color: #6a737d;
  word-break: break-word;
}

.markdown-renderer :deep(table) {
  border-collapse: collapse;
  width: 100%;
  table-layout: fixed;
  overflow-wrap: break-word;
}

.markdown-renderer :deep(th) {
  border: 1px solid #dfe2e5;
  padding-left: 0.5em;
  padding-top: 0.2em;
  padding-bottom: 0.2em;
  text-align: left;
  word-break: break-word;
  font-size: 0.9em;
}
.markdown-renderer :deep(td) {
  border: 1px solid #dfe2e5;
  padding: 0.2em;
  text-align: left;
  word-break: break-word;
  font-size: 0.9em;
}

.markdown-renderer :deep(th) {
  background-color: #f6f8fa;
}

.markdown-renderer :deep(.hljs) {
  overflow-x: auto;
  scrollbar-width: thin;
}
.markdown-renderer :deep(a) {
  color: #3b82f6; /* 파란색 링크 */
  text-decoration: none;
  transition: color 0.2s;
}

.markdown-renderer :deep(a:hover) {
  color: #2563eb; /* 호버 시 진한 파란색 */
  text-decoration: underline;
}

.markdown-renderer :deep(a:visited) {
  color: #7c3aed; /* 방문한 링크는 보라색 */
}

/* 강조 효과 (bold) */
.markdown-renderer :deep(strong) {
  font-weight: 700;
  color: #1f2937;
}

/* 수평선 (horizontal rule) 여백 추가 */
.markdown-renderer :deep(hr) {
  margin-top: 1.5em;
  margin-bottom: 1.5em;
  border: none;
  border-top: 1px solid #e5e7eb;
}
</style>
