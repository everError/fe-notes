# chat-vue

### Next
output parser 로 응답 유형(data-sheet, chart 등)을 전달 하는 agent 를 호출 하도록 변경
-> 응답 유형에 따라 컴포넌트(/agent/Test 의 컴포넌트) 변경

---

### Now
- 반응형, 채팅 관련 컴포넌트 및 레이아웃 개발
- 채팅 진행
    - Ollama gpt-oss 20B 호출
- 마크다운 페이지에 응답 바인딩

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```
