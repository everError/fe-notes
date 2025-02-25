# Yarn Workspaces 개요

## 1. Yarn Workspaces란?

Yarn Workspaces는 하나의 저장소에서 여러 패키지를 효율적으로 관리할 수 있도록 도와주는 **모노레포(Monorepo) 기능**입니다.
이를 통해 **의존성 공유, 패키지 관리 간소화, 빌드 최적화** 등을 할 수 있습니다.

## 2. Yarn Workspaces 초기화

### 2.1 프로젝트 폴더 생성

```sh
mkdir my-monorepo
cd my-monorepo
```

### 2.2 `package.json` 초기화 및 설정

```sh
yarn init -y
```

이후 `package.json` 파일을 수정하여 **workspaces 설정을 추가**합니다.

#### 📌 `package.json` 예시

```json
{
  "private": true,
  "name": "my-monorepo",
  "version": "1.0.0",
  "workspaces": ["packages/*"]
}
```

- `private: true` → Workspaces는 private 프로젝트에서만 동작합니다.
- `workspaces` → `packages/` 폴더 내부의 모든 서브 패키지를 Workspaces로 관리합니다.

## 3. 하위 패키지 추가

### 3.1 `packages` 폴더 생성

```sh
mkdir packages
```

### 3.2 하위 패키지 생성 (`app` 예제)

```sh
mkdir packages/app
cd packages/app
yarn init -y
```

#### 📌 `packages/app/package.json` 예시

```json
{
  "name": "@my-monorepo/app",
  "version": "1.0.0",
  "main": "index.js"
}
```

## 4. 의존성 관리

### 4.1 의존성 설치

루트에서 한 번의 명령어로 모든 workspace 패키지의 의존성을 설치할 수 있습니다.

```sh
yarn install
```

### 4.2 특정 패키지에 의존성 추가

하위 패키지(`packages/app`)에 특정 패키지를 추가하려면 다음 명령어를 실행합니다.

```sh
yarn workspace @my-monorepo/app add lodash
```

## 5. 패키지 실행

각 패키지를 실행하려면 `yarn workspace` 명령어를 사용합니다.

```sh
yarn workspace @my-monorepo/app run build
```

## 6. 공통 의존성 추가 (루트에서 공유)

공통으로 사용되는 패키지를 루트에서 설치하면 모든 workspace에서 공유됩니다.

```sh
yarn add typescript -W
```

## 7. 패키지 삭제

하위 패키지에서 특정 패키지를 제거하려면 다음 명령어를 사용합니다.

```sh
yarn workspace @my-monorepo/app remove lodash
```

## 8. 정리

### ✅ Yarn Workspaces의 장점

- **의존성 공유**: 동일한 패키지를 중복 설치하지 않음
- **단일 `node_modules`**: 최적화된 패키지 관리
- **개별 패키지 독립성 유지**: 하위 패키지에서 별도로 의존성을 관리 가능
- **빌드 속도 향상**: 병렬 실행 지원
