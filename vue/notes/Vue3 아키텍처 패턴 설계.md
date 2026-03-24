# Vue 3 아키텍처 패턴 설계 가이드

---

## 1. 상태 관리 패턴 비교

Vue 3에서 상태를 관리하는 방법은 크게 5가지입니다. 각각 해결하는 문제가 다르고, 잘못 선택하면 구조가 무너집니다.

### 1-1. Component-local State (`ref`, `reactive`)

```typescript
const count = ref(0);
const form = reactive({ name: "", email: "" });
```

**적합한 경우:** 해당 컴포넌트에서만 쓰이는 상태. 폼 입력값, 토글, 로컬 UI 상태.

**부적합한 경우:** 여러 컴포넌트가 같은 상태를 참조해야 할 때. props drilling으로 해결하려다 3단계 이상 내려가면 유지보수가 어려워집니다.

---

### 1-2. Pinia Store

```typescript
export const useCounterStore = defineStore("counter", () => {
  const count = ref(0);
  const increment = () => count.value++;
  return { count, increment };
});
```

**장점:**

- 어디서든 `useCounterStore()`로 같은 인스턴스 접근 — 컴포넌트, 라우터 가드, 다른 store, 유틸 함수 모두
- DevTools에서 실시간 상태 확인, 시간여행 디버깅
- SSR 지원 (Nuxt에서 요청별 인스턴스 자동 분리)
- HMR(Hot Module Replacement) 지원 — 개발 중 상태 유지

**단점:**

- 이름 기반 싱글턴 — `defineStore('counter')`는 앱 전체에서 하나. 같은 Store를 여러 인스턴스로 만들 수 없음
- Vue에 종속 — 순수 TypeScript 환경(Node.js 스크립트, 테스트)에서 사용하려면 Pinia 초기화가 필요
- 과용하면 모든 상태가 글로벌이 됨 — 컴포넌트 로컬로 충분한 상태까지 Store에 넣으면 불필요한 결합

**적합한 경우:**

- 여러 컴포넌트가 공유하는 UI 상태 (사이드바 열림, 선택된 메뉴, 테마)
- setup() 바깥에서 접근해야 하는 상태 (라우터 가드, 타이머 콜백)
- DevTools로 디버깅이 필요한 상태

**부적합한 경우:**

- 호출할 때마다 독립된 인스턴스가 필요한 경우 (폼 상태, 그리드 Selection)
- 보안 민감 데이터 (토큰 — DevTools 노출)
- 앱별 설정 주입이 필요한 경우 (Factory 패턴이 더 적합)

---

### 1-3. provide/inject

```typescript
// 상위 컴포넌트 또는 Plugin
app.provide(SERVICE_KEY, serviceInstance);

// 하위 컴포넌트
const service = inject(SERVICE_KEY);
```

**장점:**

- 컴포넌트 트리 기반 스코프 — 앱 전체에 provide할 수도 있고, 특정 서브트리에만 provide할 수도 있음
- 인스턴스 교체 가능 — 테스트에서 mock 주입이 쉬움
- InjectionKey로 타입 안전

**단점:**

- **setup() 안에서만 `inject()` 호출 가능** — 라우터 가드, setTimeout 콜백, 외부 모듈에서 사용 불가. 이게 가장 큰 제약
- DevTools 지원 없음 — provide된 값을 DevTools에서 확인할 수 없음
- 암시적 의존성 — 컴포넌트가 어떤 provide에 의존하는지 코드만 봐서는 알기 어려움

**적합한 경우:**

- Plugin이 만든 인스턴스를 컴포넌트에 전달 (PrimeVue의 `useConfirm()`, Vue Router의 `useRouter()`)
- 서브트리 범위 스코프가 필요한 경우 (폼 그룹 내에서만 유효한 밸리데이션 컨텍스트)

**부적합한 경우:**

- 라우터 가드에서 접근해야 하는 경우
- 전역 싱글턴 상태 관리 (Pinia가 더 적합)

---

### 1-4. Module-level Singleton (모듈 레벨 변수)

```typescript
// module.ts — import한 모든 곳에서 같은 ref를 참조
const activeCount = ref(0);
export const isLoading = computed(() => activeCount.value > 0);

export function startLoading() {
  activeCount.value++;
}
export function endLoading() {
  activeCount.value--;
}
```

**장점:**

- 가장 단순 — 별도 프레임워크(Pinia) 불필요
- 어디서든 import로 접근 — setup() 제약 없음
- 번들 크기 영향 없음

**단점:**

- DevTools 미지원 — 디버깅이 어려움
- SSR에서 위험 — 모듈 레벨 변수는 모든 요청이 공유. Nuxt 등 SSR 환경에서 사용자 간 상태가 섞일 수 있음
- 테스트에서 초기화가 어려움 — 모듈이 한 번 로드되면 상태가 유지됨
- 교체 불가 — 인스턴스를 바꿀 수 없으므로 mock이 어려움

**적합한 경우:**

- 단순한 전역 카운터, 플래그 (로딩 카운트, feature flag)
- DevTools로 볼 필요 없는 값
- SSR을 사용하지 않는 SPA

**부적합한 경우:**

- 복잡한 상태 (객체, 배열, 중첩 구조)
- SSR 환경
- 디버깅이 중요한 상태

---

### 1-5. Factory + Singleton (createXxx 패턴)

```typescript
// 생성 — 앱 초기화 시
export function createAuthService(options: AuthOptions): AuthInstance {
  const token = ref<string | null>(null);
  const login = async (credentials) => { ... };
  return { token, login };
}

// 사용측
export const auth = createAuthService({
  onFailure: () => router.push('/login'),
});

// Plugin에서 provide
app.provide(AUTH_KEY, auth);
```

**장점:**

- 앱별 설정 주입 — Factory 함수의 인자로 옵션/콜백/URL 등을 전달
- 직접 import + provide 동시 가능 — setup() 안팎 모두 접근
- 인스턴스 생성 시점 제어 — 의존성 순서를 명시적으로 관리
- 순환 의존 해결 용이 — 인스턴스 간 콜백 주입으로 해결

**단점:**

- 보일러플레이트 — Factory 함수, 싱글턴 파일, provide 등록 코드가 각각 필요
- DevTools 미지원 — Pinia가 아니므로
- 개발자가 직접 provide를 빠뜨릴 수 있음

**적합한 경우:**

- 앱별 설정이 다른 인프라 서비스 (인증, WebSocket, API 클라이언트)
- 인스턴스 간 상호 참조가 있는 경우 (auth ↔ ws)
- 보안 민감 데이터를 DevTools에서 숨기고 싶은 경우

**부적합한 경우:**

- 단순 UI 상태 (Pinia가 더 간단)
- 앱별 설정이 없는 경우 (Factory의 이점이 없음)

---

## 2. 패턴 비교 매트릭스

| 기준            | Component ref | Pinia Store | provide/inject | Module Singleton | Factory+Singleton |
| --------------- | :-----------: | :---------: | :------------: | :--------------: | :---------------: |
| 다중 인스턴스   |      ✅       |     ❌      |       ✅       |        ❌        |        ❌         |
| setup 바깥 접근 |      ❌       |     ✅      |       ❌       |        ✅        |        ✅         |
| DevTools        |      ❌       |     ✅      |       ❌       |        ❌        |        ❌         |
| 앱별 설정 주입  |      ❌       |      △      |       ✅       |        ❌        |        ✅         |
| SSR 안전        |      ✅       |     ✅      |       ✅       |        ❌        |        ❌         |
| 테스트 용이     |      ✅       |     ✅      |       ✅       |        △         |        ✅         |
| 보일러플레이트  |     최소      |    적음     |      중간      |       최소       |       많음        |

---

## 3. Composable 설계 패턴

### 3-1. Per-component Composable

```typescript
export function useSelection<T>() {
  const data = ref<T | null>(null);
  // ... 매번 새 인스턴스
  return { data };
}
```

**특징:** 호출할 때마다 독립된 상태. 같은 화면에서 여러 번 호출해도 서로 영향 없음.

**적합:** 폼 상태, 선택 상태, 로컬 로직 캡슐화

---

### 3-2. Shared Composable (싱글턴 composable)

```typescript
const globalState = ref(0);

export function useCounter() {
  // 모든 호출이 같은 globalState를 공유
  return { count: globalState };
}
```

**특징:** 모듈 레벨 변수를 composable로 감싼 것. 실질적으로 Module Singleton과 동일하지만 Vue 컨벤션에 맞는 인터페이스를 제공.

**주의:** SSR에서 문제 됨. 의도적으로 싱글턴이라는 것을 문서화해야 함.

---

### 3-3. Composable Factory (defineXxx)

```typescript
export function defineApi(setup) {
  // composable을 반환하는 함수를 반환
  return () => {
    const api = useApi();
    return setup(api);
  };
}

// 정의 — 파일 레벨
export const useItemApi = defineApi((api) => ({
  items: api.get<Item[]>("/items"),
}));

// 사용 — setup() 안
const { items } = useItemApi();
```

**특징:** "정의"와 "사용"을 분리. 정의는 파일 레벨에서, 사용은 setup() 안에서. 내부적으로 inject/useQuery 등 setup() 전용 API를 호출해야 할 때 유용.

**적합:** API 엔드포인트 선언, 복잡한 composable 구성

---

### 3-4. Composable + Store 자동 등록

```typescript
export function useSelection<T>() {
  const selection = { data, isDirty, guard, ... };

  // 글로벌 레지스트리에 자동 등록
  if (getCurrentScope()) {
    const store = useGuardStore();
    const unregister = store.register(selection);
    onScopeDispose(unregister);  // unmount 시 자동 해제
  }

  return selection;
}
```

**특징:** composable은 per-component 인스턴스를 만들지만, 내부에서 store에 자동 등록하여 글로벌 추적이 가능. 개발자는 등록/해제를 신경 쓸 필요 없음.

**장점:**

- 수동 등록 누락 방지 — `useSelection()`을 쓰기만 하면 가드가 자동 작동
- 라이프사이클 자동 관리 — `onScopeDispose`로 메모리 누수 없음

**단점:**

- 내부 동작이 암시적 — composable 내부에서 store를 조작하는 걸 모를 수 있음
- `getCurrentScope()` 체크가 필요 — setup 밖에서 호출되면 등록 안 됨

---

## 4. 의존성 주입(DI) 전략 비교

### 4-1. provide/inject만 사용

```typescript
// Plugin
app.provide(AUTH_KEY, authInstance);

// Component
const auth = inject(AUTH_KEY);

// Router guard — ❌ 불가
const auth = inject(AUTH_KEY); // Error: inject() outside setup()
```

**한계:** 라우터 가드, Pinia store action, setTimeout 콜백 등 setup 바깥에서 접근 불가.

---

### 4-2. Singleton만 사용 (provide 없이)

```typescript
// auth.ts
export const auth = createAuth({ ... });

// 어디서든
import { auth } from './auth';
```

**한계:** 테스트에서 인스턴스 교체가 어려움. 컴포넌트 트리 기반 스코프 분리 불가.

---

### 4-3. Singleton + provide (하이브리드)

```typescript
// 생성
export const auth = createAuth({ ... });

// provide 등록
app.provide(AUTH_KEY, auth);

// Component (inject)
const auth = useAuth(); // inject(AUTH_KEY)

// Router guard (direct import)
import { auth } from './auth';
```

**장점:**

- setup() 안에서는 inject로 Vue 컨벤션에 맞게 사용
- setup() 바깥에서는 직접 import로 접근
- 같은 인스턴스를 참조하므로 상태 동기화 문제 없음
- 테스트에서 provide로 mock 주입 가능

**단점:**

- 같은 인스턴스에 대해 두 가지 접근 경로가 생김 — 컨벤션 문서화 필요
- 싱글턴 파일(`auth.ts`)과 Plugin(`createAdevWeb`)에서 이중 설정

---

### 4-4. Pinia (자체 DI)

```typescript
// 정의
export const useAuthStore = defineStore('auth', () => { ... });

// 어디서든 — setup 안팎 모두
const authStore = useAuthStore();
```

**장점:** provide/inject + singleton의 장점을 Pinia가 한 번에 해결. 별도 파일 분리 불필요.

**단점:** Factory 옵션 주입이 어려움. DevTools 노출. 이름 기반 싱글턴.

---

## 5. 어디에 로직을 둘 것인가

### 5-1. "Fat Store" 안티패턴

```typescript
// ❌ Store에 API 호출, 밸리데이션, UI 로직 전부
defineStore('item', () => {
  const items = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const searchForm = reactive({ keyword: '' });
  const selection = ref(null);

  const fetchItems = async () => { ... };
  const saveItem = async () => { ... };
  const validateForm = () => { ... };
  const handleRowClick = () => { ... };

  return { items, loading, fetchItems, saveItem, ... };
});
```

**문제:**

- Store가 화면 전체의 로직을 담당 — God Object
- 다른 화면에서 재사용 불가 (fetchItems가 특정 UI에 묶여 있음)
- 테스트에서 Store 전체를 초기화해야 함

---

### 5-2. Store는 상태만, 로직은 Composable

```typescript
// Store — 상태만
defineStore("item", () => {
  const items = ref<Item[]>([]);
  return { items };
});

// Composable — 로직
function useItemPage() {
  const store = useItemStore();
  const api = useItemApi();
  const selection = useSelection<Item>();

  const search = async (params) => {
    await api.items.fetch(params);
  };

  return { items: store.items, selection, search };
}
```

**장점:** Store는 얇고, Composable은 화면별 로직을 담당. Store는 여러 화면에서 공유 가능.

---

### 5-3. Store 없이 Composable + TanStack Query

```typescript
// API 캐시가 사실상 Store 역할
const useItemApi = defineApi((api) => ({
  items: api.get<Item[]>("/items"),
}));

// 컴포넌트에서 직접 사용 — 별도 Store 불필요
const { items } = useItemApi();
await items.fetch(params);
// items.data가 반응형이고 캐싱됨
```

**장점:** 서버 상태(API 데이터)를 위한 별도 Store가 필요 없음. TanStack Query가 캐싱, 중복 요청 방지, 자동 갱신을 처리.

**핵심 구분:** 서버 상태(API 응답)는 Query 캐시, 클라이언트 상태(UI 상태, 선택 상태)는 Composable 또는 Store.

---

## 6. 순환 의존 해결 패턴

두 모듈이 서로를 필요로 하는 경우 (예: 인증 ↔ WebSocket).

### 6-1. 콜백 주입 패턴

```typescript
// auth는 ws를 import하지 않음
function createAuth() {
  let wsRefresher = null;

  const registerWsRefresher = (fn) => {
    wsRefresher = fn;
  };
  const refresh = async () => {
    if (wsRefresher) return await wsRefresher();
    return await restRefresh();
  };

  return { refresh, registerWsRefresher };
}

// ws가 auth에 콜백을 주입
function createWebSocket(auth) {
  const connect = async () => {
    // 연결 성공 후
    auth.registerWsRefresher(refreshToken);
  };
}
```

**장점:** import 순환 없음. 런타임에 연결.

---

### 6-2. 이벤트 기반 패턴

```typescript
const eventBus = mitt();

// auth
eventBus.on('ws:connected', () => { ... });

// ws
eventBus.emit('ws:connected');
```

**단점:** 타입 안전성 약함. 흐름 추적 어려움. 디버깅 어려움.

---

### 6-3. 중재자 패턴

```typescript
// 둘 다 모르는 제3의 모듈이 연결
function initApp(auth, ws) {
  ws.onConnected(() => {
    auth.setRefresher(ws.refreshToken);
  });
}
```

**장점:** 각 모듈이 서로를 모름. 연결 로직이 한 곳에 집중.

---

## 7. 선택 의사결정 플로우차트

```
상태/로직을 어디에 둘까?
│
├─ 이 컴포넌트에서만 쓰는가?
│   └─ Yes → ref/reactive (component-local)
│
├─ 여러 컴포넌트가 공유하는가?
│   ├─ 서버 데이터인가?
│   │   └─ Yes → TanStack Query (defineApi)
│   │
│   ├─ setup() 바깥 접근이 필요한가?
│   │   ├─ 앱별 설정 주입 필요?
│   │   │   └─ Yes → Factory + Singleton + provide
│   │   └─ No → Pinia Store
│   │
│   └─ 호출마다 독립 인스턴스?
│       └─ Yes → Composable (per-component)
│
├─ 상태가 없는 순수 로직?
│   └─ Yes → Utility Function
│
└─ 단순 전역 플래그/카운터?
    └─ Yes → Module-level Singleton
```

---

## 8. 핵심 원칙

**"상태의 범위가 패턴을 결정한다"**

- 컴포넌트 하나 → `ref`
- 컴포넌트 서브트리 → `provide/inject`
- 앱 전체 (UI 상태) → `Pinia Store`
- 앱 전체 (인프라, 설정 필요) → `Factory + Singleton`
- 서버 데이터 → `TanStack Query`
- 상태 없음 → `Utility`

**"접근 방법이 패턴을 제약한다"**

- setup() 안에서만 쓰면 → 아무거나 다 됨
- setup() 바깥에서 써야 하면 → inject 불가 → Store 또는 Singleton
- 앱마다 다르게 설정해야 하면 → Store 불편 → Factory

**"복잡할수록 조합한다"**

단일 패턴으로 모든 걸 해결하려 하지 않습니다. Composable이 Store에 자동 등록되고, Factory가 provide와 결합하고, Store가 다른 Store를 참조합니다. 각 패턴이 자기 역할만 하고, 조합으로 복잡한 요구사항을 해결합니다.
