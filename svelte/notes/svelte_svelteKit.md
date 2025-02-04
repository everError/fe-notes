# Svelte & SvelteKit 정리

## 1. Svelte란?

- Svelte는 기존의 프레임워크와 달리 런타임이 아닌 **컴파일 타임**에 코드가 변환되는 프론트엔드 프레임워크
- 가상 DOM을 사용하지 않고, 직접 DOM을 조작하여 성능이 뛰어남
- `.svelte` 파일을 사용하여 HTML, CSS, JavaScript를 하나의 파일에서 관리 가능

### 특징

- 반응형(Reactivity) 기능 내장
- 간결한 문법과 직관적인 상태 관리
- 빌드 시점에서 최적화되어 빠른 실행 속도 제공

### 기본 문법 예제

```svelte
<script>
  let count = 0;
</script>

<button on:click={() => count++}>
  클릭 수: {count}
</button>
```

## 2. SvelteKit이란?

- SvelteKit은 **Svelte 기반의 풀스택 프레임워크**로, Svelte 애플리케이션을 쉽게 구축하고 배포할 수 있도록 지원
- Vite를 기본 빌드 도구로 사용하며, 서버 사이드 렌더링(SSR), 정적 사이트 생성(SSG), 클라이언트 사이드 렌더링(CSR) 등을 지원

### 주요 기능

- **라우팅 시스템**: 파일 기반의 동적 라우팅
- **SSR 지원**: 서버에서 데이터를 렌더링 후 클라이언트에 전달 가능
- **API 엔드포인트**: 서버 로직을 쉽게 추가 가능
- **Vite 기반 개발 환경**: 빠른 핫 리로딩 및 빌드 성능 제공

### 프로젝트 생성 및 실행

```sh
npm create svelte@latest my-svelte-app
cd my-svelte-app
npm install
npm run dev
```

### 기본 라우팅 예제

```svelte
<!-- src/routes/+page.svelte -->
<script>
  export let data;
</script>

<h1>{data.title}</h1>
```

```js
// src/routes/+page.server.js
export function load() {
  return {
    title: "SvelteKit 기본 페이지",
  };
}
```

## 3. Svelte와 SvelteKit 비교

| 특징      | Svelte                   | SvelteKit           |
| --------- | ------------------------ | ------------------- |
| 동작 방식 | 컴파일된 JS 파일 실행    | SSR, CSR, SSG 지원  |
| 라우팅    | 없음 (수동 관리)         | 파일 기반 라우팅    |
| API 호출  | fetch() 사용             | API 엔드포인트 내장 |
| 사용 목적 | 단일 페이지 애플리케이션 | 풀스택 애플리케이션 |

## 4. 참고 자료

- [Svelte 공식 문서](https://svelte.dev/)
- [SvelteKit 공식 문서](https://kit.svelte.dev/)
