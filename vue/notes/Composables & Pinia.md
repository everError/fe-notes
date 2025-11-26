# 📘 Vue Composables & Pinia 정리 문서

## 1. 개요

Vue 3는 Composition API 도입 이후, 기능별 로직 분리와 재사용성을 극대화하기 위해 **Composables**라는 패턴을 활용한다.
반면, **Pinia**는 Vue의 공식 전역 상태 관리 라이브러리로서, 애플리케이션 전반에서 공유하는 상태와 비즈니스 로직을 관리한다.

두 개는 비슷해 보이지만 **역할이 명확히 다르며**, 서로 대체하는 개념이 아니다.
각각의 목적을 이해하고 올바르게 적용하는 것이 Vue 아키텍처의 핵심이다.

---

# 2. Composables란?

## 📌 정의

**Composables는 Composition API로 작성한, 재사용 가능한 기능 로직 모듈이다.**
특정 기능을 하나의 함수로 묶어 여러 컴포넌트에서 재활용하도록 만든다.

## 📍 특징

* Vue Composition API 기반 (`ref`, `reactive`, `computed`, `watch` 등)
* **상태 스코프가 해당 Composable을 사용하는 컴포넌트에 한정됨**
* 기능 단위로 로직을 정리해 가독성과 유지보수 향상
* `useXxx()` 네이밍으로 작성

## 📚 일반적인 Composable 예시

* `useFetch()` — API 요청 로직
* `usePagination()` — 페이지네이션 로직
* `useForm()` — 유효성 검사 로직
* `useKeyboard()` — 키보드 이벤트 핸들링
* `useDebounce()` — 디바운스 처리

## 🧪 예시 코드

```ts
// composables/useCounter.ts
import { ref } from 'vue'

export function useCounter() {
  const count = ref(0)

  const increment = () => count.value++
  const reset = () => (count.value = 0)

  return { count, increment, reset }
}
```

---

# 3. Pinia란?

## 📌 정의

**Pinia는 Vue 공식 전역 상태 관리 라이브러리**로, 앱 전반에서 필요한 상태를 저장하고 액션을 통해 비즈니스 로직을 처리한다.

## 📍 특징

* 전역 싱글톤 스토어
* 앱 전체에서 상태 공유
* 비즈니스 로직을 중앙에서 관리
* Typescript 친화적
* Vue DevTools 지원

## 📚 Pinia가 적합한 상황

* 로그인 정보 (user info / 토큰)
* 사용자 UI 설정 (다크 모드 등)
* 카트/장바구니
* 전역 캐싱 데이터
* 접근 권한 정보

## 🧪 간단한 Pinia 예시

```ts
// stores/userStore.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    id: null,
    name: null,
    token: null,
  }),
  actions: {
    login(user) {
      this.id = user.id
      this.name = user.name
      this.token = user.token
    },
    logout() {
      this.id = null
      this.name = null
      this.token = null
    }
  }
})
```

---

# 4. Composables vs Pinia 비교

| 항목     | **Composables**        | **Pinia**       |
| ------ | ---------------------- | --------------- |
| 목적     | **로직 재사용**             | **전역 상태 관리**    |
| 상태 범위  | Composable을 호출한 컴포넌트 안 | 앱 전체 싱글톤        |
| 적합한 경우 | API 호출, 폼 검증, 공통 기능    | 로그인, 설정, 글로벌 상태 |
| 공유 여부  | 기본적으로 공유되지 않음          | 모든 컴포넌트에서 공유    |
| 라이프사이클 | 컴포넌트가 파괴되면 종료          | 앱이 종료될 때까지 유지   |
| 의존성    | Vue 만으로 충분             | Pinia 설치 필요     |

---

# 5. 둘을 어떻게 함께 사용하면 좋을까?

대부분의 Vue 프로젝트는 이렇게 구성된다:

```
src/
  composables/
    useFetch.ts
    usePagination.ts
    useKeyboard.ts

  stores/
    userStore.ts
    settingsStore.ts
    cartStore.ts
```

## 📌 권장 패턴

* **기능 로직은 composables에 넣는다.**
  예: 페이지네이션, 디바운스, 폼 검증, 특정 컴포넌트들이 공유하는 로직

* **전역 상태는 Pinia에 넣는다.**
  예: 로그인 상태, 테마, 언어 설정, 장바구니, 공통 캐시

* **Composable 내부에서 Pinia store를 참조하는 구조도 가능**
  → 복잡한 재사용 로직을 깔끔하게 모듈화 가능

---

# 6. 잘못된 예 vs 올바른 예

## ❌ 잘못된 사용

API 요청 로직을 Pinia에 넣기
→ 전역 공유가 필요 없는 로직인데 전역 스토어가 불필요하게 비대해짐

## ✔ 올바른 사용

API 요청 로직 = **Composable**
로그인 결과 저장 = **Pinia**

---

# 7. 요약

### ✔ Composables

* **로직 재사용**
* 기능 단위 분리
* 컴포넌트 스코프

### ✔ Pinia

* **전역 상태 관리**
* 중앙 비즈니스 로직
* 앱 전체 공유

> 두 개는 역할이 다르기 때문에 **함께 사용하는 것이 베스트**다.