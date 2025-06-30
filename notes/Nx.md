# Nx 개요

## Nx란?

Nx는 Monorepo 기반 프로젝트를 효율적으로 관리하고 확장할 수 있도록 도와주는 빌드 시스템 및 도구 모음입니다. JavaScript, TypeScript, React, Angular, Node.js, NestJS, Express 등 다양한 프레임워크를 지원하며, 대규모 프로젝트에서 특히 유용합니다.

- **제공자**: [Nx.dev](https://nx.dev)
- **주요 기능**: Monorepo 관리, 의존성 그래프, 캐싱, 병렬 빌드, lint/test/build 자동화
- **지원 언어 및 프레임워크**:

  - React, Angular, Vue, Next.js, NestJS, Express, Node.js, 웹 컴포넌트 등

---

## 주요 기능

### 1. Monorepo 지원

- 여러 앱과 라이브러리를 하나의 리포지토리에서 관리
- 코드 공유 및 일관성 유지가 용이함

### 2. 프로젝트 생성 및 관리

```bash
npx create-nx-workspace@latest
```

- 다양한 템플릿(react, angular, next, nest 등)을 지원
- `apps/`, `libs/` 구조로 구분

### 3. 캐싱 및 병렬 처리

- 동일 작업에 대해 결과를 캐싱하여 속도 향상
- CI/CD에서 빌드 시간 단축

### 4. 의존성 그래프 시각화

```bash
nx graph
```

- 앱과 라이브러리 간 의존성 분석 및 시각화

### 5. 작업 실행기(Executors) & 생성기(Generators)

- `nx build`, `nx test`, `nx lint`, `nx generate` 등
- 커스텀 생성기 작성 가능

### 6. Affected 명령어

- 변경된 파일에 따라 영향받은 프로젝트만 선택적으로 실행

```bash
nx affected:build
nx affected:test
```

---

## Nx와 다른 도구 비교

| 도구      | 특징                                             |
| --------- | ------------------------------------------------ |
| Nx        | 강력한 캐시, 의존성 그래프, 플러그인 기반 확장성 |
| Turborepo | Vercel에서 만든 도구, 직관적인 설정, 캐싱 지원   |
| Lerna     | 오래된 모노레포 도구, 기본적인 패키지 관리 중심  |

---

## Nx 설치 및 예시

### 설치

```bash
npm install -g nx
```

### 예시: React 앱 + 공통 라이브러리 생성

```bash
npx create-nx-workspace@latest my-workspace
cd my-workspace
nx generate @nrwl/react:application my-app
nx generate @nrwl/react:library ui-components
```

---

## Nx 주요 폴더 구조

```
my-workspace/
├── apps/
│   └── my-app/
├── libs/
│   └── ui-components/
├── nx.json
├── project.json
├── tsconfig.base.json
└── workspace.json
```
