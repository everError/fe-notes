# ✅ Web Worker 정리 (프론트엔드 개발자 필독)

## 1. **Web Worker란?**

브라우저에서 **메인 스레드(UI 스레드)**와 별도로 동작하는 **백그라운드 스레드**.

### 즉,

* 오래 걸리는 연산(대량 계산, 이미지 처리, 텍스트 파싱, 압축 등)을
* **UI를 멈추지 않고**
* **백그라운드에서 실행**하게 만드는 기술.

## 2. 왜 필요한가?

| 문제                          | 결과                           |
| --------------------------- | ---------------------------- |
| 메인 스레드에서 무거운 작업 수행          | 버튼 클릭, 스크롤 등 UI 멈춤           |
| JS는 싱글 스레드                  | 연산이 길어지면 ‘Not responding’ 발생 |
| Vue, React 등 SPA는 UI 스레드 의존 | 성능 저하, 렌더링 지연                |

➡ **Web Worker 사용 → UI 렉 없이 작업 가능**

---

# 3. Web Worker 종류

### 1) **Dedicated Worker (일반적인 Worker)**

* 한 페이지(스레드)에서만 사용
* 가장 일반적

### 2) **Shared Worker**

* 여러 탭/윈도우에서 **공유**

### 3) **Service Worker**

* 오프라인 캐싱, 푸시 알림, 네트워크 프록시 등
* 용도 완전히 다름 (PWA 핵심)

대부분은 **Dedicated Worker**를 사용함.

---

# 4. Web Worker 구조

## 메인 스레드

```ts
const worker = new Worker('/my-worker.js');

worker.postMessage({ a: 1, b: 2 });

worker.onmessage = (event) => {
  console.log('결과:', event.data);
};
```

## worker 파일 (my-worker.js)

```js
self.onmessage = (e) => {
  const { a, b } = e.data;
  const result = a + b;
  self.postMessage(result);
};
```

---

# 5. TypeScript에서 Web Worker 사용

TS 환경에서는 Worker를 import하려면 선언이 필요하다.

`worker.d.ts`

```ts
declare module '*.worker.ts' {
  class WebWorker extends Worker {
    constructor();
  }
  export default WebWorker;
}
```

`main.ts`

```ts
import MyWorker from './math.worker.ts';

const worker = new MyWorker();
worker.postMessage({ count: 5000000 });
```

`math.worker.ts`

```ts
self.onmessage = e => {
  const n = e.data.count;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += i;
  self.postMessage(sum);
};
```

---

# 6. Web Worker의 특징

## ✔ 장점

* UI 스레드와 완전히 분리 → 렉 없음
* 대규모 연산에 최적
* 멀티스레드처럼 동작 → 병렬 처리 가능

## ✘ 단점

* DOM 접근 불가 (Important!)
* Vue/React 같은 프레임워크 코드 직접 사용 불가
* 메모리 사용 증가
* worker 생성 비용 있음
* 외부 라이브러리 사용 시 import 제한 존재

---

# 7. Web Worker가 특히 좋은 작업

| 작업         | 설명                    |
| ---------- | --------------------- |
| 대량 데이터 처리  | JSON 대용량 파싱, 필터링      |
| 이미지/비디오 처리 | 리사이징, 포맷 변환           |
| 파일 압축      | zip, gzip 등           |
| 암호화 작업     | AES, RSA 등 heavy 연산   |
| 스케줄러       | 백그라운드 계산 후 UI 업데이트    |
| AI 모델 추론   | 작은 모델이면 worker로 분리 가능 |

---

# 8. Vue 3 + Web Worker 예제

## worker 생성

`src/workers/calc.worker.ts`

```ts
self.onmessage = (e) => {
  let total = 0;
  for (let i = 0; i < e.data; i++) total += i;
  self.postMessage(total);
};
```

## Vue 컴포넌트

```vue
<script setup lang="ts">
import CalcWorker from '@/workers/calc.worker.ts';

const worker = new CalcWorker();

worker.onmessage = (e) => {
  console.log('결과:', e.data);
};

const run = () => {
  worker.postMessage(50_000_000);
};
</script>

<template>
  <button @click="run">연산 실행</button>
</template>
```

---

# 9. Web Worker 주의점 (중요!)

### 🚫 DOM / window / document 사용 불가

```js
document.querySelector(...)  ❌  
window.setTimeout(...)       ❌  
Vue reactive state            ❌  
```

### ⭕ Web Worker 전용 객체만 사용 가능

`self.setTimeout`, `fetch`, `WebCrypto`, `IndexedDB` 등은 가능.

### Worker는 **파일로 분리**해야 한다

(Inline worker 가능하지만 번들러 설정 복잡)

### 메인 스레드 ↔ Worker의 통신은 항상 **postMessage**

→ JSON 구조로 전달됨 (클론 비용 ↑)

### Worker 내부에서 에러 발생 시

```ts
worker.onerror = e => console.error(e);
```

---

# 10. Web Worker vs setTimeout / setInterval / requestIdleCallback

| 기술                    | 특징                           |
| --------------------- | ---------------------------- |
| `setTimeout`          | 메인 스레드에서 동작 → heavy 작업은 렉 발생 |
| `requestIdleCallback` | idle 시간에 실행 → 안정적이지만 느림      |
| **Web Worker**        | 별도 스레드 → heavy 작업 최적         |

→ **Heavy 연산 = Worker 필수**

---

# 11. requestAnimationFrame과 함께 사용

렌더링은 main thread
연산은 worker
이렇게 분리하면 성능 최고.

---

# 12. 결론

### Web Worker는 다음 상황에서 필수이다:

* “UI 끊김 없이 무거운 연산을 돌리고 싶다.”
* “SPA 앱에서 렉 없이 데이터 처리하고 싶다.”
* “이미지/파일/데이터 병렬처리 하고 싶다.”

### 단,

* DOM 접근 불가
* 컴포넌트 내부 로직 사용 불가
  → **Main ↔ Worker 메시지 passing 구조 설계가 핵심**
