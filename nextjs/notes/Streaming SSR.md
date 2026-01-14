# Next.js Streaming SSR 정리

## 1. 개념

### Streaming SSR

서버에서 생성한 HTML을 전체가 완성되기 전에 부분적으로 클라이언트에 전송하는 방식

### 기술 기반

- HTTP/1.1 Chunked Transfer Encoding
- React 18의 Suspense 컴포넌트
- `renderToPipeableStream` (Node.js) 또는 `renderToReadableStream` (Edge)

---

## 2. 동작 원리

### 전통적 SSR

```
1. 모든 데이터 fetch 완료 대기
2. 전체 HTML 생성
3. 클라이언트에 전송
4. 하이드레이션
```

### Streaming SSR

```
1. 준비된 부분의 HTML 즉시 전송
2. 비동기 작업은 백그라운드에서 계속 진행
3. 완료된 부분을 추가로 전송
4. 점진적 하이드레이션
```

---

## 3. 구현 방법

### 기본 구조

```typescript
// app/page.tsx
import { Suspense } from "react";

export default function Page() {
  return (
    <>
      <Header />

      <Suspense fallback={<LoadingSkeleton />}>
        <AsyncContent />
      </Suspense>

      <Footer />
    </>
  );
}

async function AsyncContent() {
  const data = await fetch("https://api.example.com/data");
  const json = await data.json();
  return <div>{json.content}</div>;
}
```

### HTTP 응답 구조

**첫 번째 청크 (즉시)**:

```html
<!DOCTYPE html>
<html>
  <body>
    <header>Header Content</header>
    <div id="S:1">
      <div>Loading...</div>
    </div>
    <footer>Footer Content</footer>
  </body>
</html>
```

**두 번째 청크 (데이터 로드 후)**:

```html
<template id="B:1">
  <div>Actual Content</div>
</template>
<script>
  // DOM 교체 로직
</script>
```

---

## 4. 성능 지표

### TTFB (Time To First Byte)

- 전통적 SSR: 모든 데이터 로드 완료 시간
- Streaming SSR: 초기 HTML 생성 시간 (대폭 감소)

### FCP (First Contentful Paint)

- 전통적 SSR: TTFB + 렌더링 시간
- Streaming SSR: 초기 청크 도착 + 렌더링 시간 (감소)

### LCP (Largest Contentful Paint)

- 두 방식 모두 유사 (최종 콘텐츠 로드 시간 동일)

---

## 5. 사용 시나리오

### 적합한 경우

- 외부 API 호출이 느린 경우
- 데이터베이스 쿼리가 무거운 경우
- 페이지 일부만 동적이고 나머지는 정적인 경우
- 개인화된 콘텐츠가 포함된 경우

### 부적합한 경우

- 모든 데이터가 빠르게 로드되는 경우
- 완전한 정적 페이지
- SEO가 모든 콘텐츠를 즉시 필요로 하는 경우

---

## 6. 구현 패턴

### 병렬 스트리밍

```typescript
export default function Page() {
  return (
    <div>
      <Suspense fallback={<Skeleton />}>
        <Component1 />
      </Suspense>

      <Suspense fallback={<Skeleton />}>
        <Component2 />
      </Suspense>
    </div>
  );
}
```

Component1과 Component2가 독립적으로 병렬 로드됨

### 중첩 스트리밍

```typescript
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Layout>
        <Suspense fallback={<ContentSkeleton />}>
          <Content />
        </Suspense>
      </Layout>
    </Suspense>
  );
}
```

외부에서 내부로 순차적 렌더링

---

## 7. 에러 처리

### Error Boundary와 조합

```typescript
import { ErrorBoundary } from "react-error-boundary";

export default function Page() {
  return (
    <ErrorBoundary fallback={<ErrorUI />}>
      <Suspense fallback={<Loading />}>
        <AsyncComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### 에러 발생 시 동작

- Suspense 내부에서 에러 발생
- ErrorBoundary가 캐치
- fallback UI 표시
- 나머지 페이지는 정상 렌더링 유지

---

## 8. 하이드레이션

### Selective Hydration

- 화면에 보이는 컴포넌트 우선 하이드레이션
- 사용자 인터랙션 발생 영역 우선 처리
- 나머지는 백그라운드에서 처리

### 과정

```
1. Static HTML 수신 및 렌더링
2. JavaScript 번들 로드
3. React가 DOM에 연결
4. 이벤트 리스너 부착
5. 추가 콘텐츠 스트리밍 및 하이드레이션
```

---

## 9. 제약사항

### CDN 캐싱

- 동적 스트리밍 특성상 전체 응답 캐싱 어려움
- 부분적 캐싱 전략 필요

### 디버깅

- 여러 청크로 분할되어 전송
- 네트워크 탭에서 추적 복잡

### Client Component 제약

```typescript
// Server Component에서만 async 사용 가능
async function ServerComponent() {
  const data = await fetch(...)
  return <div>{data}</div>
}

// Client Component는 불가능
'use client'
function ClientComponent() {
  // async 함수로 선언 불가
  // useEffect + useState 패턴 사용
}
```

---

## 10. 최적화 기법

### Loading UI 최적화

```typescript
<Suspense
  fallback={
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
    </div>
  }
>
  <Content />
</Suspense>
```

### 데이터 Preloading

```typescript
import { preload } from "react-dom";

function Navigation() {
  return (
    <Link
      href="/dashboard"
      onMouseEnter={() => preload("/api/data", { as: "fetch" })}
    >
      Dashboard
    </Link>
  );
}
```

---

## 11. 실무 예제

```typescript
// app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <main>
      <header>
        <h1>Dashboard</h1>
      </header>

      {/* 빠른 데이터 */}
      <Suspense fallback={<MetricsSkeleton />}>
        <Metrics />
      </Suspense>

      {/* 느린 데이터 */}
      <Suspense fallback={<ChartSkeleton />}>
        <Charts />
      </Suspense>

      {/* 매우 느린 데이터 */}
      <Suspense fallback={<TableSkeleton />}>
        <DataTable />
      </Suspense>
    </main>
  );
}

async function Metrics() {
  const data = await db.query("SELECT * FROM metrics_cache");
  return <MetricsDisplay data={data} />;
}

async function Charts() {
  const data = await db.query(
    "SELECT * FROM analytics WHERE date > NOW() - INTERVAL 30 DAY"
  );
  return <ChartDisplay data={data} />;
}

async function DataTable() {
  const data = await db.query(
    "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100"
  );
  return <Table data={data} />;
}
```

---

## 12. 핵심 정리

### 기술 스택

- HTTP Chunked Transfer Encoding
- React 18 Suspense
- Next.js 13+ App Router

### 주요 이점

- TTFB 감소
- 초기 렌더링 속도 향상
- SEO 유지

### 트레이드오프

- 구현 복잡도 증가
- 캐싱 전략 변경 필요
- 디버깅 어려움 증가
