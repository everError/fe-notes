# SvelteKit Adapter 비교 (`adapter-node` vs `adapter-static`)

## 1. 개요
SvelteKit에서는 애플리케이션을 배포할 때 다양한 **Adapter**를 선택할 수 있습니다. 대표적으로 많이 사용되는 두 가지 Adapter는 **`@sveltejs/adapter-node`**(Node.js 서버 기반)와 **`@sveltejs/adapter-static`**(정적 사이트 생성)입니다. 이 문서에서는 두 Adapter의 차이점과 사용 사례를 정리합니다.

---

## 2. `adapter-node` (Node.js 서버 배포)
### 🔹 개념
- **Node.js 환경에서 SvelteKit을 실행할 수 있도록 하는 Adapter**
- Express, Fastify 같은 **Node.js 서버를 실행하면서 SvelteKit을 렌더링**
- **SSR(Server-Side Rendering) 및 API 엔드포인트 사용 가능**

### 🔹 설치 및 설정
```sh
npm install @sveltejs/adapter-node
```
```js
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter()
  }
};
```
```sh
npm run build
node build
```

### 🔹 장점
✅ **SSR 지원** → SEO 및 동적 데이터 처리 가능  
✅ **API 엔드포인트(`+server.js`) 사용 가능**  
✅ **WebSocket, 실시간 데이터 처리 가능**  

### 🔹 단점
❌ **Node.js 서버 필요** → 정적 파일처럼 간단한 배포 불가능  
❌ **서버 비용 발생 가능**  

### 🔹 사용 사례
- **SSR이 필요한 블로그, 전자상거래 사이트**
- **API 엔드포인트가 포함된 풀스택 애플리케이션**
- **실시간 데이터를 활용하는 애플리케이션**

---

## 3. `adapter-static` (정적 사이트 배포)
### 🔹 개념
- **완전히 정적 HTML, CSS, JavaScript 파일로 빌드하여 배포**
- 모든 페이지를 **미리 렌더링(SSG, Static Site Generation)**
- **API 엔드포인트(`+server.js`) 사용 불가능**
- **Netlify, GitHub Pages, Vercel 같은 정적 호스팅 서비스에 최적화**

### 🔹 설치 및 설정
```sh
npm install @sveltejs/adapter-static
```
```js
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter()
  }
};
```
```sh
npm run build
```

### 🔹 장점
✅ **서버 없이 배포 가능** → 호스팅 비용 절감  
✅ **빠른 로딩 속도** → 정적 파일이므로 최적화됨  
✅ **SEO 최적화 가능 (미리 렌더링된 HTML 제공)**  
✅ **Netlify, Vercel, GitHub Pages 등에 간편 배포 가능**  

### 🔹 단점
❌ **SSR 불가능** → 동적 페이지는 미리 빌드해야 함  
❌ **API 엔드포인트(`+server.js`) 사용 불가능**  
❌ **실시간 데이터, 로그인 기반 페이지 구현 어려움**  

### 🔹 사용 사례
- **블로그, 포트폴리오 사이트**
- **마케팅 랜딩 페이지**
- **서버리스 환경에서 빠른 배포가 필요한 웹사이트**

---

## 4. `adapter-node` vs `adapter-static` 비교 정리
| Adapter | 서버 필요 여부 | SSR 지원 | API(`+server.js`) 지원 | 사용 사례 |
|---------|------------|---------|----------------|---------|
| **`adapter-node`** | ✅ 필요 | ✅ 가능 | ✅ 가능 | 서버 기반 웹앱, 실시간 데이터, API 포함 프로젝트 |
| **`adapter-static`** | ❌ 불필요 | ❌ 불가능 (SSG만 가능) | ❌ 불가능 | 블로그, 정적 사이트, Netlify/Vercel 배포 |

📌 **`adapter-node`는 서버를 유지하면서 동적인 기능(SSR, API)을 제공해야 할 때 적합**  
📌 **`adapter-static`은 정적으로 미리 렌더링할 수 있는 사이트를 빠르고 간편하게 배포할 때 적합**  

---

## 5. 결론
- **SSR 및 API가 필요하면 `adapter-node` 사용**  
- **정적 사이트를 배포하려면 `adapter-static` 사용**  
- 프로젝트에 따라 적절한 Adapter를 선택하여 사용하면 됩니다. 🚀

