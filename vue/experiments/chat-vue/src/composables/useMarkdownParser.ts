import { ref, shallowRef } from 'vue'
import MarkdownIt from 'markdown-it'
import type { MarkdownBlock, StreamBuffer } from '@/defines/markdown'

const BLOCK_PATTERNS = {
  heading: /^#{1,6}\s/m,
  hr: /^(?:[-*_]){3,}\s*$/m,
  list: /^[\s]*[-*+]\s|^[\s]*\d+\.\s/m,
  blockquote: /^>/m,
  table: /^\|.+\|$/m
}

export function useMarkdownParser() {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true
  })

  const buffer = shallowRef<StreamBuffer>({
    content: '',
    blocks: [],
    incompleteBlock: ''
  })

  const blockIdCounter = ref(0)

  function generateBlockId(): string {
    return `block-${++blockIdCounter.value}-${Date.now()}`
  }

  function detectBlockType(raw: string): MarkdownBlock['type'] {
    const trimmed = raw.trim()
    if (trimmed.startsWith('```')) return 'code'
    if (BLOCK_PATTERNS.heading.test(trimmed)) return 'heading'
    if (BLOCK_PATTERNS.hr.test(trimmed)) return 'hr'
    if (BLOCK_PATTERNS.blockquote.test(trimmed)) return 'blockquote'
    if (BLOCK_PATTERNS.list.test(trimmed)) return 'list'
    if (BLOCK_PATTERNS.table.test(trimmed)) return 'table'
    if (trimmed.startsWith('<')) return 'html'
    return 'paragraph'
  }

  function isBlockComplete(raw: string): boolean {
    const trimmed = raw.trim()
    if (trimmed.startsWith('```')) {
      const fenceMatches = trimmed.match(/```/g)
      return fenceMatches !== null && fenceMatches.length >= 2
    }
    return true
  }

  function splitIntoRawBlocks(content: string): string[] {
    const lines = content.split('\n')
    const rawBlocks: string[] = []
    let currentBlock: string[] = []
    let inCodeBlock = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          if (currentBlock.length > 0) {
            rawBlocks.push(currentBlock.join('\n'))
            currentBlock = []
          }
          inCodeBlock = true
          currentBlock.push(line)
        } else {
          currentBlock.push(line)
          rawBlocks.push(currentBlock.join('\n'))
          currentBlock = []
          inCodeBlock = false
        }
        continue
      }

      if (inCodeBlock) {
        currentBlock.push(line)
        continue
      }

      if (line.trim() === '') {
        if (currentBlock.length > 0) {
          rawBlocks.push(currentBlock.join('\n'))
          currentBlock = []
        }
        continue
      }

      if (BLOCK_PATTERNS.heading.test(line) || BLOCK_PATTERNS.hr.test(line)) {
        if (currentBlock.length > 0) {
          rawBlocks.push(currentBlock.join('\n'))
          currentBlock = []
        }
        rawBlocks.push(line)
        continue
      }

      currentBlock.push(line)
    }

    if (currentBlock.length > 0) {
      rawBlocks.push(currentBlock.join('\n'))
    }

    return rawBlocks
  }

  function parseBlock(raw: string): MarkdownBlock {
    const type = detectBlockType(raw)
    const html = md.render(raw)

    return {
      id: generateBlockId(),
      type,
      raw,
      html,
      highlighted: type !== 'code'
    }
  }

  function parseContent(content: string): MarkdownBlock[] {
    const rawBlocks = splitIntoRawBlocks(content)
    return rawBlocks.map(parseBlock)
  }

  function parseStreamChunk(chunk: string): {
    newBlocks: MarkdownBlock[]
    updatedLastBlock: MarkdownBlock | null
  } {
    const currentBuffer = buffer.value
    const fullContent = currentBuffer.incompleteBlock + chunk
    const rawBlocks = splitIntoRawBlocks(fullContent)

    const newBlocks: MarkdownBlock[] = []
    let updatedLastBlock: MarkdownBlock | null = null
    let incompleteBlock = ''

    for (let i = 0; i < rawBlocks.length; i++) {
      const raw = rawBlocks[i]
      const isLast = i === rawBlocks.length - 1

      if (isLast && !isBlockComplete(raw)) {
        incompleteBlock = raw
      } else {
        const block = parseBlock(raw)

        if (i === 0 && currentBuffer.incompleteBlock) {
          updatedLastBlock = block
        } else {
          newBlocks.push(block)
        }
      }
    }

    buffer.value = {
      content: currentBuffer.content + chunk,
      blocks: [...currentBuffer.blocks, ...newBlocks],
      incompleteBlock
    }

    return { newBlocks, updatedLastBlock }
  }

  function flushBuffer(): MarkdownBlock | null {
    const currentBuffer = buffer.value
    if (!currentBuffer.incompleteBlock) return null

    const block = parseBlock(currentBuffer.incompleteBlock)
    buffer.value = {
      ...currentBuffer,
      blocks: [...currentBuffer.blocks, block],
      incompleteBlock: ''
    }

    return block
  }

  function resetBuffer() {
    buffer.value = {
      content: '',
      blocks: [],
      incompleteBlock: ''
    }
    blockIdCounter.value = 0
  }

  return {
    buffer,
    parseContent,
    parseStreamChunk,
    flushBuffer,
    resetBuffer,
    md
  }
}
