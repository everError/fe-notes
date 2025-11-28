# MarkdownViewer 컴포넌트 설계 문서

## 개요

대용량 마크다운 콘텐츠를 효율적으로 렌더링하는 Vue 3 컴포넌트입니다. 스트리밍 입력과 일괄 입력 모두 지원하며, 가상 스크롤링을 통해 여러 개의 블록도 부드럽게 처리합니다.

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      MarkdownViewer.vue                      │
│                    (메인 컨테이너 컴포넌트)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ useMarkdownParser│  │useCodeHighlighter│  │useVirtual   │ │
│  │                 │  │                 │  │Scroller     │ │
│  │ • 블록 분할      │  │ • Shiki 싱글톤   │  │             │ │
│  │ • 스트림 버퍼    │  │ • 비동기 하이라이팅│  │ • 가시 영역  │ │
│  │ • markdown-it   │  │ • 대용량 스킵    │  │ • 높이 측정  │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │        │
│           └────────────────────┼───────────────────┘        │
│                                ▼                            │
│                    ┌─────────────────────┐                  │
│                    │  MarkdownBlock.vue  │                  │
│                    │   (개별 블록 렌더링)  │                  │
│                    │  • XSS 방지         │                  │
│                    │  • 복사 기능        │                  │
│                    └─────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 디렉토리 구조

```
src/
├── components/
│   ├── MarkdownViewer.vue    # 메인 컴포넌트
│   └── MarkdownBlock.vue     # 개별 블록 렌더링
├── composables/
│   ├── useMarkdownParser.ts  # 마크다운 파싱 로직
│   ├── useCodeHighlighter.ts # 코드 하이라이팅
│   └── useVirtualScroller.ts # 가상 스크롤링
├── types/
│   └── markdown.ts           # 타입 정의
└── styles/
    └── markdown.css          # 스타일시트
```

---

## 파일별 상세 설명

### 1. types/markdown.ts

타입 정의 파일입니다. 모든 컴포넌트와 composable에서 공유하는 인터페이스를 정의합니다.

```typescript
// 마크다운 블록 단위
interface MarkdownBlock {
  id: string           // 고유 식별자
  type: BlockType      // 블록 종류
  raw: string          // 원본 마크다운 텍스트
  html: string         // 변환된 HTML
  highlighted?: boolean // 코드 하이라이팅 완료 여부
}

// 스트리밍 시 사용하는 버퍼
interface StreamBuffer {
  content: string           // 전체 누적 콘텐츠
  blocks: MarkdownBlock[]   // 파싱 완료된 블록들
  incompleteBlock: string   // 아직 완성되지 않은 블록
}
```

**설계 의도**: 마크다운을 블록 단위로 분리하여 개별 렌더링이 가능하도록 합니다. 스트리밍 시 불완전한 블록(예: 닫히지 않은 코드 블록)을 버퍼에 보관하여 점진적 렌더링을 지원합니다.

---

### 2. composables/useMarkdownParser.ts

마크다운 텍스트를 블록 단위로 파싱하는 핵심 로직입니다.

**주요 기능**:

| 함수 | 역할 |
|------|------|
| `parseContent()` | 전체 콘텐츠를 한 번에 파싱 (일괄 로드용) |
| `parseStreamChunk()` | 스트리밍 청크를 점진적으로 파싱 |
| `flushBuffer()` | 스트리밍 종료 시 남은 버퍼 처리 |
| `resetBuffer()` | 버퍼 초기화 |

**블록 분할 로직**:

```
입력: "# 제목\n\n본문\n\n```js\ncode\n```"

분할 결과:
  Block 1: { type: 'heading', raw: '# 제목' }
  Block 2: { type: 'paragraph', raw: '본문' }
  Block 3: { type: 'code', raw: '```js\ncode\n```' }
```

**스트리밍 처리 흐름**:

```
청크 1: "# 제목\n\n본문\n\n```js"
  → Block 1, 2 완성
  → "```js" 는 incompleteBlock에 보관

청크 2: "\ncode\n```"
  → incompleteBlock + 청크 2 = 완성된 코드 블록
  → Block 3 완성
```

---

### 3. composables/useCodeHighlighter.ts

Shiki를 사용한 코드 하이라이팅을 담당합니다.

**싱글톤 패턴**:

```typescript
// 모듈 레벨에서 단일 인스턴스 유지
let highlighterInstance: Highlighter | null = null

async function getHighlighter() {
  if (highlighterInstance) return highlighterInstance
  // 최초 1회만 생성
  highlighterInstance = await createHighlighter(...)
  return highlighterInstance
}
```

**설계 이유**: Shiki 인스턴스 생성은 무거운 작업입니다. 여러 컴포넌트가 동시에 사용해도 인스턴스는 하나만 유지하여 메모리를 절약합니다.

**비동기 하이라이팅**:

```typescript
async function highlightBlocksAsync(blocks, onHighlighted) {
  for (const block of codeBlocks) {
    // requestIdleCallback으로 메인 스레드 블로킹 방지
    await new Promise(resolve => {
      requestIdleCallback(() => {
        const html = highlightCode(...)
        onHighlighted(block.id, html)
        resolve()
      })
    })
  }
}
```

**대용량 코드 처리**: 30,000자 이상의 코드는 하이라이팅을 생략하고 이스케이프만 적용합니다.

---

### 4. composables/useVirtualScroller.ts

대용량 블록 렌더링을 위한 가상 스크롤링을 구현합니다.

**동작 원리**:

```
전체 블록: 1000개
화면에 보이는 영역: 10개 블록 분량

일반 렌더링: DOM 노드 1000개 생성 (느림)
가상 스크롤: DOM 노드 ~20개만 생성 (빠름)
```

**핵심 계산**:

```typescript
const visibleBlocks = computed(() => {
  const start = scrollTop.value
  const end = start + containerHeight.value

  return blocks.filter(block => {
    // overscan: 위아래 여유 블록
    return block.top >= start - overscan &&
           block.bottom <= end + overscan
  })
})
```

**높이 측정**: 각 블록의 실제 높이를 측정하여 정확한 스크롤 위치를 계산합니다.

```typescript
function measureBlock(blockId, element) {
  measurements.set(blockId, {
    height: element.offsetHeight
  })
}
```

---

### 5. components/MarkdownBlock.vue

개별 마크다운 블록을 렌더링하는 컴포넌트입니다.

**XSS 방지**:

```typescript
const sanitizedHtml = computed(() => {
  return DOMPurify.sanitize(props.block.html, {
    ADD_TAGS: ['pre', 'code', 'svg', ...],
    ADD_ATTR: ['class', 'viewBox', ...]
  })
})
```

**코드 복사 기능**: 이벤트 위임 패턴으로 복사 버튼 클릭을 처리합니다.

```typescript
async function handleClick(event) {
  const btn = event.target.closest('.copy-btn')
  if (!btn) return

  const code = wrapper.querySelector('pre code').innerText
  await navigator.clipboard.writeText(code)
  // 복사 완료 UI 피드백
}
```

---

### 6. components/MarkdownViewer.vue

모든 것을 조합하는 메인 컨테이너 컴포넌트입니다.

**Props**:

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `content` | string | - | 마크다운 콘텐츠 |
| `streaming` | boolean | false | 스트리밍 모드 여부 |
| `autoScroll` | boolean | true | 스트리밍 시 자동 스크롤 |
| `virtualScroll` | boolean | true | 가상 스크롤 사용 여부 |
| `virtualScrollThreshold` | number | 50 | 가상 스크롤 활성화 블록 수 |

**렌더링 모드 분기**:

```vue
<template>
  <!-- 가상 스크롤 모드 -->
  <div v-if="useVirtual" class="scroll-content">
    <div v-for="block in visibleBlocks" :style="block.style">
      <MarkdownBlock :block="block" />
    </div>
  </div>

  <!-- 일반 모드 -->
  <template v-else>
    <MarkdownBlock v-for="block in blocks" :block="block" />
  </template>
</template>
```

**콘텐츠 변경 감지**:

```typescript
watch(() => props.content, (newContent, oldContent) => {
  if (props.streaming) {
    // 스트리밍: 새로운 청크만 파싱
    const chunk = newContent.slice(oldContent?.length || 0)
    processStreamChunk(chunk)
  } else {
    // 일괄: 전체 재파싱
    processContent(newContent)
  }
})
```

---

### 7. styles/markdown.css

마크다운 요소들의 스타일을 정의합니다.

**코드 블록 구조**:

```
┌─────────────────────────────────────┐
│ .code-block-wrapper (relative)      │
│ ┌─────────────────────────────────┐ │
│ │ .copy-panel (absolute, 전체 덮음) │ │
│ │ ┌───────────────────────────┐   │ │
│ │ │ .copy-btn (sticky)        │   │ │ ← 스크롤 시 상단 고정
│ │ └───────────────────────────┘   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ .code-header                    │ │
│ │ │ .code-lang                    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ pre > code                      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**sticky 복사 버튼 원리**:

```css
.copy-panel {
  position: absolute;
  top: 0;
  bottom: 0;           /* 코드 블록 전체 높이 */
  pointer-events: none; /* 클릭 통과 */
}

.copy-btn {
  position: sticky;
  top: 0.5em;          /* 스크롤 시 상단에 고정 */
  pointer-events: auto; /* 버튼만 클릭 가능 */
}
```

---

## 데이터 흐름

### 일괄 로드

```
content (전체 마크다운)
    │
    ▼
useMarkdownParser.parseContent()
    │
    ▼
MarkdownBlock[] (파싱된 블록 배열)
    │
    ▼
useCodeHighlighter.highlightBlocksAsync()
    │ (비동기, 블록별 콜백)
    ▼
blocks 상태 업데이트
    │
    ▼
MarkdownBlock 컴포넌트 렌더링
```

### 스트리밍

```
chunk 1 → parseStreamChunk() → 완성된 블록 렌더링
                             → 불완전 블록 버퍼 보관
    │
chunk 2 → parseStreamChunk() → 버퍼 + 청크 결합
                             → 완성된 블록 렌더링
    │
streaming=false → flushBuffer() → 남은 블록 렌더링
```

---

## 성능 최적화 전략

| 전략 | 구현 방식 | 효과 |
|------|----------|------|
| **블록 단위 파싱** | 논리적 블록으로 분할 | 스트리밍 시 점진적 렌더링 |
| **가상 스크롤** | 화면에 보이는 블록만 렌더링 | DOM 노드 수 최소화 |
| **Shiki 싱글톤** | 모듈 레벨 인스턴스 공유 | 메모리 절약 |
| **비동기 하이라이팅** | requestIdleCallback 사용 | 메인 스레드 블로킹 방지 |
| **대용량 코드 스킵** | 30,000자 이상 하이라이팅 생략 | 브라우저 프리징 방지 |
| **높이 캐싱** | 측정된 블록 높이 저장 | 스크롤 계산 최적화 |

---

## 사용 예시

### 기본 사용

```vue
<template>
  <MarkdownViewer :content="markdownText" />
</template>
```

### 스트리밍 (AI 응답 등)

```vue
<template>
  <MarkdownViewer
    :content="streamedContent"
    :streaming="isStreaming"
    :auto-scroll="true"
  />
</template>

<script setup>
const streamedContent = ref('')
const isStreaming = ref(true)

// SSE나 WebSocket으로 청크 수신
eventSource.onmessage = (e) => {
  streamedContent.value += e.data
}

eventSource.onclose = () => {
  isStreaming.value = false
}
</script>
```

### 대용량 콘텐츠

```vue
<template>
  <div class="h-screen overflow-y-auto">
    <MarkdownViewer
      :content="largeDocument"
      :virtual-scroll="true"
      :virtual-scroll-threshold="30"
    />
  </div>
</template>
```

---

## 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| vue | 3.x | 프레임워크 |
| markdown-it | latest | 마크다운 파싱 |
| shiki | latest | 코드 하이라이팅 |
| dompurify | latest | XSS 방지 |

```bash
npm install markdown-it shiki dompurify
npm install -D @types/markdown-it @types/dompurify
```