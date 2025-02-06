# SvelteKit SSG vs SSR 정리

## 1. 개요

SvelteKit에서 **SSG(Static Site Generation)**와 **SSR(Server-Side Rendering)**을 비교하고, 페이지 생성 방식 및 작동 방식을 분석한다.

## 2. SSG(정적 사이트 생성)와 SSR(서버 사이드 렌더링) 차이

| 구분               | **SSG (Static Site Generation)**     | **SSR (Server-Side Rendering)**           |
| ------------------ | ------------------------------------ | ----------------------------------------- |
| **HTML 생성 시점** | **빌드 시점**에 정적 HTML 생성       | **요청 시점**에 HTML 생성                 |
| **데이터 최신성**  | ❌ 빌드 이후 변경된 데이터 반영 불가 | ✅ 요청마다 최신 데이터 반영 가능         |
| **로드 속도**      | ✅ 즉시 로딩 (캐싱 가능)             | ❌ 서버에서 처리 후 응답 (속도 느림 가능) |
| **서버 필요 여부** | ❌ 필요 없음 (정적 호스팅 가능)      | ✅ 필요 (Node.js 서버에서 실행)           |
| **사용 사례**      | 블로그, 문서, 랜딩 페이지            | 로그인 페이지, 대시보드, 실시간 데이터    |

## 3. SSG와 SSR 적용 방식

### ✅ **SSG 적용 방식 (`prerender: true`)**

```ts
export const prerender = true;

export function load() {
  return { message: "빌드 시점에 생성된 데이터" };
}
```

📌 **빌드 시점에 `message`가 포함된 정적 HTML이 생성됨. 이후 요청할 때 동일한 HTML을 제공**

### ✅ **SSR 적용 방식 (`+page.server.ts`)**

```ts
export async function load() {
  await new Promise((resolve) => setTimeout(resolve, 5000)); // 5초 지연
  return { message: "서버에서 5초 후 렌더링된 데이터입니다." };
}
```

📌 **페이지 요청 시마다 서버에서 HTML을 새로 생성하여 클라이언트에 전달**

## 4. 개발자 도구를 이용한 SSG/SSR 판별 방법

### 🔹 1) HTML 소스 보기 (`Ctrl + U`)

- **SSG**: HTML에 `message`가 포함되어 있음
- **SSR**: HTML이 비어 있음 (JS 실행 후 데이터가 추가됨)

### 🔹 2) 네트워크 요청 확인 (`F12 → Network → Doc`)

- **SSG**: HTML 응답 시간이 즉시 반환됨
- **SSR**: HTML 응답 시간이 5초 정도 지연됨

### 🔹 3) JavaScript 비활성화 (`F12 → Settings → Disable JavaScript`)

- **SSG**: 데이터가 정상적으로 보임
- **SSR**: 데이터가 보이지 않거나 비어 있음

## 5. 결론

- **SSG는 정적 HTML을 제공하므로 빠르지만, 실시간 데이터 반영이 어렵다.**
- **SSR은 요청마다 데이터를 가져와 렌더링하므로 최신 데이터를 유지할 수 있지만, 속도가 상대적으로 느릴 수 있다.**
- **로그인 페이지, 사용자 맞춤형 데이터가 필요한 경우 SSR이 적합하고, 블로그, 랜딩 페이지 등은 SSG가 적합하다.**

📌 **SvelteKit에서는 `prerender: true`를 사용하면 SSG, `+page.server.ts`를 사용하면 SSR을 적용할 수 있다.** 🚀
