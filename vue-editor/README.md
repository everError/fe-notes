# Vue Editor

**Vite + Vue 3 + TypeScript 기반 시각적 컴포넌트 에디터 (Monorepo)**

## 📦 프로젝트 구조

```

vue-editor/
├── apps/
│   └── editor/           # 실제 에디터 웹앱 (Vite + Vue 3)
├── packages/
│   ├── core/             # 에디터 트리 데이터, 타입, 로직 (프레임워크 독립)
│   └── schema/           # 등록 가능한 컴포넌트 메타 정보 정의
└── pnpm-workspace.yaml   # pnpm 모노레포 설정

```

## 🚀 주요 특징

- **Monorepo 구조** (pnpm)
- **시각적 컴포넌트 편집** (Toolbox 드래그, Canvas 렌더, Inspector 편집)
- **Slot 중첩, Props 실시간 수정**
- **내가 만든 컴포넌트 자유 등록 및 드래그&드랍 배치**
- **코드 미리보기 및 복사/저장**
- **TailwindCSS 기반 반응형 UI**
- **저장/불러오기(Import/Export) 지원**

## ⚡️ 빠른 시작

```bash
# 1. 의존성 설치
pnpm install

# 2. 개발 서버 실행
pnpm --filter @vue-editor/editor dev
```

- `http://localhost:5173` 접속

## 🛠️ 주요 명령어

- `pnpm dev` : 에디터 개발 서버 실행
- `pnpm build` : 프로덕션 빌드
- `pnpm lint` : 코드 린트
- `pnpm format` : 코드 포매팅

## 📁 폴더 설명

- `apps/editor/` : 실제 Vue 3 기반 에디터 애플리케이션
- `packages/core/` : 노드 트리, 타입, 유틸리티, 코드 생성 등 에디터 핵심 로직
- `packages/schema/`: 사용할 수 있는 컴포넌트 메타 정의 (Toolbox 자동 반영)

## 🧩 커스텀 컴포넌트 추가 방법

1. `apps/editor/src/components/MyButton.vue` 작성
2. `packages/schema/src/componentMeta.ts`에 메타 등록
3. `apps/editor/src/componentMap.ts`에 컴포넌트 import/매핑 추가
4. Toolbox에서 바로 사용 가능!

## 💾 저장/불러오기

- 우측 Inspector 패널에서 현재 트리 상태를 JSON으로 저장/불러오기 지원
- `JSON.stringify(rootNodes)`로 내보내기/불러오기
