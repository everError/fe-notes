## 📦 pnpm 정리

### ✅ pnpm이란?

- **pnpm**은 Node.js 패키지 매니저입니다. (npm, yarn과 유사한 역할)
- 성능 최적화와 저장공간 절약을 위해 **하드 링크 기반 저장 구조**를 사용합니다.
- Monorepo를 위한 **workspace 기능**을 자체 내장하고 있습니다.

---

### 🚀 주요 특징

| 항목           | 설명                                                                             |
| -------------- | -------------------------------------------------------------------------------- |
| 디스크 절약    | 동일한 패키지는 전역 저장소에 한 번만 저장하고, 각 프로젝트에는 하드 링크로 연결 |
| 설치 속도      | 빠름. 캐시와 하드 링크를 활용하여 효율적 설치                                    |
| workspace 내장 | `pnpm-workspace.yaml`을 사용해 Monorepo 구성 가능                                |
| 의존성 격리    | 프로젝트 간 의존성을 격리시켜 충돌 방지 (strict node_modules 구조)               |
| CLI 호환성     | 대부분의 npm/yarn 스크립트와 호환                                                |

---

### 🧱 기본 파일 구조 예시

```txt
my-monorepo/
├── apps/
│   ├── web/
│   └── admin/
├── packages/
│   ├── ui/
│   └── utils/
├── pnpm-workspace.yaml
├── package.json
```

#### 🔹 `pnpm-workspace.yaml` 예시

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

#### 🔹 `package.json` 루트 예시

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm -r run dev"
  }
}
```

---

### 🧩 주요 명령어

| 명령어                 | 설명                                 |
| ---------------------- | ------------------------------------ |
| `pnpm install`         | 의존성 설치                          |
| `pnpm add <pkg>`       | 패키지 추가                          |
| `pnpm remove <pkg>`    | 패키지 제거                          |
| `pnpm update`          | 의존성 업데이트                      |
| `pnpm -r run <script>` | 모든 workspace에서 script 실행       |
| `pnpm exec <cmd>`      | 특정 명령 실행 (ex. eslint, jest 등) |

---

### 📚 참고 사항

- `node_modules` 내부 구조가 npm/yarn과 다르기 때문에, 간혹 특정 도구에서 경로 이슈가 발생할 수 있습니다.
- `.npmrc` 대신 `.pnpmfile.cjs`를 통해 설정을 커스터마이징할 수 있습니다.
- `hoist` 전략은 비활성화되어 있어 명시적 의존성 관리가 요구됩니다.

---

### 🏁 정리

- pnpm은 빠르고 안전한 패키지 매니저로, 특히 **Monorepo 환경**에서 강력한 생산성을 제공합니다.
- 엄격한 의존성 격리와 효율적인 저장 방식은 대규모 프로젝트에서 큰 장점이 됩니다.

> 공식 문서: [https://pnpm.io](https://pnpm.io)
