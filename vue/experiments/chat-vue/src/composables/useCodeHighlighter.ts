import { ref } from 'vue'
import { createHighlighter, type Highlighter } from 'shiki'
import type { MarkdownBlock } from '@/defines/markdown'

let highlighterInstance: Highlighter | null = null
let highlighterPromise: Promise<Highlighter> | null = null
const instanceCount = ref(0)

const SUPPORTED_LANGS = [
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'html',
  'css',
  'json',
  'yaml',
  'markdown',
  'bash',
  'shell',
  'sql',
  'vue',
  'jsx',
  'tsx',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'kotlin',
  'swift',
  'dart',
  'dockerfile',
  'graphql',
  'xml',
  'text',
  'plaintext'
]

async function getHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) {
    return highlighterInstance
  }

  if (highlighterPromise) {
    return highlighterPromise
  }

  highlighterPromise = createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: SUPPORTED_LANGS
  })

  highlighterInstance = await highlighterPromise
  highlighterPromise = null

  return highlighterInstance
}

export function useCodeHighlighter() {
  const isReady = ref(false)

  async function initHighlighter() {
    if (isReady.value) return

    try {
      await getHighlighter()
      isReady.value = true
      instanceCount.value++
    } catch (error) {
      console.error('Failed to initialize syntax highlighter:', error)
    }
  }

  function extractCodeInfo(raw: string): { code: string; lang: string } {
    const lines = raw.trim().split('\n')
    const firstLine = lines[0]
    const lang = firstLine.replace(/^```/, '').trim() || 'plaintext'
    const code = lines.slice(1, -1).join('\n')
    return { code, lang }
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  function highlightCode(code: string, lang: string): string {
    if (code.length > 30000) {
      return escapeHtml(code)
    }

    if (!highlighterInstance) {
      return escapeHtml(code)
    }

    try {
      const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : 'plaintext'
      // shiki는 <pre><code>를 포함한 전체 HTML 반환
      const html = highlighterInstance.codeToHtml(code, {
        lang: safeLang,
        theme: 'github-light'
      })
      // shiki 결과에서 code 내용만 추출
      const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/)
      return match ? match[1] : escapeHtml(code)
    } catch (error) {
      console.warn(`Failed to highlight code for lang: ${lang}`, error)
      return escapeHtml(code)
    }
  }

  // 기존 마크다운 뷰어와 동일한 구조
  function wrapCodeBlock(highlightedCode: string, lang: string): string {
    return `
      <div class="code-block-wrapper">
        <div class="copy-panel">
          <button class="copy-btn" aria-label="Copy code">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-text">Copy</span>
            <span class="copied-text">Copied!</span>
          </button>
        </div>
        <div class="code-header">
          <span class="code-lang">${lang}</span>
        </div>
        <pre><code class="hljs language-${lang}">${highlightedCode}</code></pre>
      </div>
    `
  }

  async function highlightBlock(block: MarkdownBlock): Promise<MarkdownBlock> {
    if (block.type !== 'code' || block.highlighted) {
      return block
    }

    if (!isReady.value) {
      await initHighlighter()
    }

    const { code, lang } = extractCodeInfo(block.raw)
    const highlighted = highlightCode(code, lang)

    return {
      ...block,
      html: wrapCodeBlock(highlighted, lang),
      highlighted: true
    }
  }

  async function highlightBlocksAsync(
    blocks: MarkdownBlock[],
    onBlockHighlighted: (blockId: string, html: string) => void
  ): Promise<void> {
    const codeBlocks = blocks.filter((b) => b.type === 'code' && !b.highlighted)

    if (codeBlocks.length === 0) return

    if (!isReady.value) {
      await initHighlighter()
    }

    for (const block of codeBlocks) {
      await new Promise<void>((resolve) => {
        const callback = () => {
          const { code, lang } = extractCodeInfo(block.raw)
          const highlighted = highlightCode(code, lang)
          onBlockHighlighted(block.id, wrapCodeBlock(highlighted, lang))
          resolve()
        }

        if ('requestIdleCallback' in window) {
          requestIdleCallback(callback, { timeout: 100 })
        } else {
          setTimeout(callback, 0)
        }
      })
    }
  }

  function dispose() {
    instanceCount.value--
    if (instanceCount.value <= 0 && highlighterInstance) {
      highlighterInstance.dispose()
      highlighterInstance = null
      isReady.value = false
    }
  }

  return {
    isReady,
    initHighlighter,
    highlightBlock,
    highlightBlocksAsync,
    dispose
  }
}

export function disposeHighlighter() {
  if (highlighterInstance) {
    highlighterInstance.dispose()
    highlighterInstance = null
    highlighterPromise = null
  }
}
