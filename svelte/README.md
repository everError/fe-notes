# SvelteKit 학습

## 1. 개요

- SvelteKit을 활용한 프론트엔드 개발을 학습하고 실습하는 공간
- Vite, TypeScript, TailwindCSS를 활용한 웹 프로젝트 구현

## 2. 주요 기능

- 서버 사이드 렌더링 (SSR)
- API 호출 및 데이터 처리
- 라우팅 및 페이지 전환
- 스타일링 (TailwindCSS 활용)

## 3. 사용 프레임워크 및 라이브러리

### 🔹 **프레임워크 및 주요 도구**

- **SvelteKit (`@sveltejs/kit` v2.16.0)** - Svelte 기반의 풀스택 웹 프레임워크
- **Svelte (`svelte` v5.0.0)** - UI 컴포넌트 기반의 프레임워크
- **Vite (`vite` v6.0.0)** - 빠른 번들링을 지원하는 개발 환경

### 🔹 **스타일링 관련 라이브러리**

- **TailwindCSS (`tailwindcss` v4.0.3)** - 유틸리티 퍼스트 CSS 프레임워크
- **DaisyUI (`daisyui` v5.0.0-beta.6)** - TailwindCSS 기반의 UI 컴포넌트 라이브러리

### 🔹 **개발 환경 및 코드 품질 관리**

- **TypeScript (`typescript` v5.0.0)** - 정적 타입을 지원하는 JavaScript
- **ESLint (`eslint` v9.18.0)** - 코드 품질 및 스타일 검사 도구
  - **ESLint Prettier 설정 (`eslint-config-prettier` v10.0.1)** - 코드 포맷 자동 정리
  - **ESLint Svelte 플러그인 (`eslint-plugin-svelte` v2.46.1)** - Svelte 파일을 위한 ESLint 지원
- **Prettier (`prettier` v3.4.2)** - 코드 스타일 자동 정리 도구
  - **Prettier Svelte 플러그인 (`prettier-plugin-svelte` v3.3.3)** - Svelte 파일 자동 포맷팅
  - **Prettier TailwindCSS 플러그인 (`prettier-plugin-tailwindcss` v0.6.10)** - TailwindCSS 클래스 정리 지원

### 🔹 **빌드 및 배포**

- **Node.js 기반 서버 (`@sveltejs/adapter-node` v5.2.11)** - Node 환경에서 SvelteKit 실행 가능
- **Autoprefixer (`autoprefixer` v10.4.20)** - CSS 자동 벤더 프리픽스 추가
