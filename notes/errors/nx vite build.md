# 프론트엔드 빌드 오류 해결 보고서

## 1\. 개요

Nx 모노레포 환경에서 pnpm과 Vite를 사용하여 프론트엔드 애플리케이션을 빌드하는 과정에서 발생한 두 가지 주요 오류와 그 해결 과정을 정리합니다.

---

## 2\. 오류 현상 및 해결 방안

### 오류 1: 외부 의존성 인식 실패 (`externalDependency not found`)

- **현상**: `pnpm build` 실행 시, Nx가 `@nx/vite` 플러그인의 외부 의존성인 `vite`를 찾지 못한다는 오류(`The externalDependency 'vite' for '[...]' could not be found`)가 발생했습니다.

- **원인**: Nx의 태스크 해시(Task Hash) 계산기가 pnpm의 의존성 관리 방식 하에서 `vite` 패키지를 제대로 인식하지 못하여 발생한 문제입니다.

- **해결**: 프로젝트 루트의 `nx.json` 파일에 `targetDefaults` 설정을 추가하여 `build` 작업의 기본 옵션을 명시적으로 정의했습니다.

  ```json
  // nx.json
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "options": {
        "externalDependencies": ["vite"]
      }
    }
  }
  ```

  - 위 설정을 통해 `build` 작업을 실행할 때 `vite`를 외부 의존성으로 명확히 인식시켜 해시 계산 오류를 해결했습니다.

### 오류 2: 최신 JavaScript 문법 미지원 (`Top-level await`)

- **현상**: 의존성 문제가 해결된 후 빌드를 진행하자, `Top-level await is not available in the configured target environment` 오류가 발생하며 빌드가 실패했습니다.

- **원인**: Vite의 기본 빌드 타겟(target environment)이 `Top-level await` 문법을 지원하지 않는 구형 브라우저 버전으로 설정되어 있어, 최신 JavaScript 코드를 변환(transpile)하지 못했습니다.

- **해결**: 각 애플리케이션의 `vite.config.mts` 파일에 빌드 타겟을 명시적으로 설정했습니다.

  ```typescript
  // 예시: apps/mes/vite.config.mts
  import { defineConfig } from "vite";
  import vue from "@vitejs/plugin-vue";

  export default defineConfig({
    // ... other configs
    build: {
      target: "es2022",
    },
  });
  ```

  - 빌드 타겟을 `es2022`로 상향 조정하여, `Top-level await`를 포함한 최신 JavaScript 문법을 지원하는 환경 기준으로 빌드하도록 수정했습니다.

---

## 3\. 결론

`nx.json` 파일 수정을 통해 Nx의 의존성 인식 문제를 해결하고, 각 앱의 `vite.config.mts` 파일에서 빌드 타겟을 최신화하여 JavaScript 호환성 문제를 해결함으로써 전체 프론트엔드 빌드 프로세스를 정상화했습니다.
