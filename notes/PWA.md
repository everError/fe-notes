# 📘 PWA (Progressive Web App) 정리 문서

## 1. PWA란?

\*\*PWA(Progressive Web App)\*\*는 웹 기술(HTML, CSS, JS)로 만들어진 애플리케이션이지만, 네이티브 앱처럼 설치 및 오프라인 사용이 가능하도록 확장된 웹 앱입니다.
👉 쉽게 말해 **"앱 같은 웹, 웹 같은 앱"**

---

## 2. PWA의 핵심 특징

- **설치 가능 (Installable)**

  - 웹사이트를 홈 화면에 앱처럼 설치 가능

- **오프라인 지원 (Offline-ready)**

  - Service Worker가 네트워크 요청을 캐싱 → 오프라인에서도 동작

- **푸시 알림 (Push Notification)**

  - 서버와 통신하여 앱 푸시 알림 제공 가능

- **백그라운드 동작**

  - 동기화, 알림 수신 등을 앱이 닫힌 상태에서도 실행

- **빠른 로딩**

  - 캐싱된 리소스를 활용해 네트워크 속도에 의존하지 않음

- **반응형 UI**

  - 데스크톱, 모바일, 태블릿 어디서든 실행

---

## 3. PWA의 구성 요소

### 1) **Web App Manifest**

- JSON 파일 (`manifest.webmanifest`)
- 앱 이름, 아이콘, 시작 화면, 색상 등 정의
- 예시:

  ```json
  {
    "name": "My Nuxt PWA",
    "short_name": "NuxtPWA",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#3b82f6",
    "icons": [
      {
        "src": "/icon-192.png",
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": "/icon-512.png",
        "sizes": "512x512",
        "type": "image/png"
      }
    ]
  }
  ```

### 2) **Service Worker**

- 백그라운드에서 실행되는 스크립트
- 네트워크 요청 가로채기, 캐싱, 푸시 알림 담당
- 주요 이벤트:

  - `install` → 캐시 생성
  - `activate` → 이전 캐시 정리
  - `fetch` → 네트워크 요청 캐싱/제공

### 3) **HTTPS**

- PWA는 반드시 HTTPS에서만 동작 (보안 요구사항)

---

## 4. PWA의 장점

- 앱스토어 배포 없이 설치 가능
- 용량이 작고 업데이트가 간단
- 네이티브 앱에 가까운 UX 제공
- 하나의 코드베이스로 웹/모바일 동시 지원
- SEO 최적화 가능 (웹 기반이므로 검색 가능)

---

## 5. PWA의 단점

- iOS(Safari) 지원이 제한적 (푸시 알림 등)
- 디바이스 API 접근 제약 (블루투스, NFC 등 일부 불가)
- 네이티브 앱 대비 UX/성능에서 차이가 있을 수 있음

---

## 6. Nuxt에서 PWA 적용하기

Nuxt에서는 `@vite-pwa/nuxt` 모듈을 사용하면 편리하게 적용 가능.

### 설치

```bash
pnpm add -D @vite-pwa/nuxt
```

### nuxt.config.ts 설정

```ts
export default defineNuxtConfig({
  modules: ["@vite-pwa/nuxt"],
  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "My Nuxt PWA",
      short_name: "NuxtPWA",
      theme_color: "#3b82f6",
      icons: [
        {
          src: "pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
  },
});
```

### 아이콘 & 스플래시 추가

- `public/` 폴더에 `pwa-192x192.png`, `pwa-512x512.png` 등 아이콘 추가
- 필요시 여러 해상도 버전 생성

---

## 7. PWA 검증

- **Lighthouse (Chrome DevTools → Audits → PWA)**
- 설치 버튼(`+` 아이콘) 확인
- 오프라인 모드에서 정상 작동 확인

---

## 8. PWA 적용 시 주의사항

- 모든 페이지가 HTTPS에서 제공돼야 함
- 첫 로딩 성능 최적화 (LCP, CLS 등 Core Web Vitals 중요)
- 캐시 전략 주의 (오래된 파일이 남을 수 있음 → `autoUpdate` 권장)
- iOS에서는 기능 제한 확인 필요

---

👉 정리하면:
**PWA는 웹 앱을 네이티브 앱처럼 설치/오프라인/알림까지 가능하게 해주는 기술**이고,
Nuxt에서는 `@vite-pwa/nuxt` 모듈을 쓰면 설정 한두 줄로 바로 적용 가능합니다 🚀
