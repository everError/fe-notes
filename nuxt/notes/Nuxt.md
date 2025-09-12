# 📘 Nuxt 정리 문서

## 1. Nuxt란?

- Vue.js 기반의 **메타 프레임워크(Meta-Framework)**
- Vue, Vite, Nitro 서버, Pinia 등을 통합 제공
- 서버 렌더링(SSR), 정적 사이트 생성(SSG), 클라이언트 전용(SPA), 서버리스까지 지원
- Nuxt 3부터는 Vite 기반 빌드와 **Nitro 엔진**으로 완전히 재설계됨
- 현재 개발 중인 버전은 Nuxt 4 (Nuxt 3와 호환되며 점진적 업그레이드 가능)

---

## 2. Nuxt의 주요 특징

### ✅ 개발 DX 향상

- 파일 기반 라우팅 (`pages/` 디렉토리 자동 라우팅)
- `layouts/`를 통한 레이아웃 시스템
- `useState`, `useFetch`, `useAsyncData` 등 **Composition API 헬퍼**
- 타입스크립트 내장 지원

### ✅ 다양한 렌더링 모드

- **SSR (Server-Side Rendering)** → SEO 최적화, 빠른 첫 페이지 로딩
- **SSG (Static Site Generation)** → 정적 사이트 배포 (Nuxt Content 등과 함께)
- **SPA (Single Page Application)** → Vue처럼 동작
- **Hybrid** → 일부 페이지만 SSR/SSG 적용 가능

### ✅ 통합 서버(Nitro)

- API 라우트(`server/api/`) 작성 가능 → 백엔드 서버 불필요
- 서버리스/엣지 런타임 배포 지원 (Vercel, Cloudflare Workers, Netlify 등)

### ✅ 모듈 생태계

- Nuxt Icon, TailwindCSS, Pinia, i18n, Content, Auth 등 **Nuxt 전용 모듈** 풍부
- 모듈 기반 확장으로 설정 최소화

---

## 3. Nuxt 프로젝트 구조

일반적인 Nuxt 프로젝트는 다음과 같습니다:

```
my-nuxt-app/
├─ .nuxt/              # 빌드 후 생성되는 내부 코드
├─ assets/             # CSS, 이미지, 폰트 등
├─ components/         # Vue 컴포넌트
├─ composables/        # Vue 3 Composition API 훅
├─ layouts/            # 공통 레이아웃
├─ middleware/         # 라우트 미들웨어
├─ pages/              # 파일 기반 라우팅
├─ plugins/            # Vue 플러그인 등록
├─ public/             # 정적 파일
├─ server/             # API 라우트, 서버 미들웨어
├─ nuxt.config.ts      # Nuxt 설정 파일
└─ package.json
```

---

## 4. Nuxt의 핵심 기능

### 📍 파일 기반 라우팅

```bash
pages/
 ├─ index.vue       → `/`
 ├─ about.vue       → `/about`
 └─ users/[id].vue  → `/users/:id`
```

### 📍 레이아웃 시스템

`layouts/default.vue`에 정의한 구조를 모든 페이지에서 공통으로 사용 가능.

### 📍 데이터 페칭

- `useFetch`, `useAsyncData` : 서버/클라이언트 모두 지원
- `server/api/` 내부에 API 작성 후 바로 호출 가능

### 📍 상태 관리

- Pinia를 기본적으로 권장 (`@pinia/nuxt` 모듈)

### 📍 타입스크립트 지원

- `nuxt.config.ts`와 `vue-tsc` 기반의 정적 분석 가능

---

## 5. Nuxt 4의 변화 (Nuxt 3 → 4)

- Vite, Webpack 동시 지원 → **Vite 권장**
- Nitro 엔진 강화 (더 빠른 서버 실행, Edge 환경 지원 확대)
- 모듈 생태계 정비 (Nuxt 3용 모듈 그대로 호환)
- Vue 3.5+ 및 TypeScript 5.x 대응
- **미래 지향적 API 안정화** (예: `defineNuxtConfig`, `useNuxtApp` 등)

---

## 6. Nuxt + TailwindCSS + Pinia + Nuxt Icon

- **TailwindCSS** → `@nuxtjs/tailwindcss` 모듈로 설치, 자동 JIT 지원
- **Pinia** → `@pinia/nuxt` 모듈로 상태관리
- **Nuxt Icon** → `nuxt-icon` 모듈 설치, `<Icon name="mdi:home" />` 바로 사용 가능
- **TypeScript** → 기본 내장, `strict: true` 모드 권장

---

## 7. Nuxt 프로젝트 시작하기

```bash
# Nuxt 프로젝트 생성 (pnpm 권장)
pnpm dlx nuxi init my-app
cd my-app
pnpm install
pnpm dev
```

---

## 8. Nuxt의 장단점

### 장점

- Vue 생태계에서 가장 강력한 풀스택 프레임워크
- DX 최강 (자동 라우팅, TS 지원, 모듈 시스템)
- SSR/SSG/SPA 모두 지원 → 유연한 배포
- Nitro 기반 API 내장 → 백엔드까지 포함 가능

### 단점

- 러닝 커브 (Vue보다 더 많은 개념 필요)
- 초기 빌드 속도는 Next.js보다 다소 느릴 수 있음
- 대규모 모노레포에서는 pnpm 등 별도 툴 필요
