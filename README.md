# Frontend Notes

이 레포지토리는 SvelteKit, Nuxt, Vue 등 다양한 프론트엔드 프레임워크를 학습하고 구현하는 공간입니다. Vite, TypeScript, TailwindCSS를 활용하여 웹 애플리케이션을 개발하는 과정을 기록합니다.

## 기술 스택

- **프레임워크**: SvelteKit, Nuxt, Vue
- **번들러**: Vite
- **언어**: TypeScript
- **스타일링**: Tailwind CSS

## 학습 폴더

- [노트 정리](./notes/)
- [SvelteKit](./svelte)
- [Nuxt](./nuxt)
  - [Nuxt Chat](./nuxt/experiments/nuxt-chat/)
- [Vue.js](./vue)
  - [Vue LLM Chat](./vue/experiments/chat-vue/)

## 폴더 구조

```
FE-NOTES/
│── notes/                                                                  # 개념 비교 및 정리
│   │── csr_vs_ssr.md                                                       # CSR, SSR 비교
│   │── data_loading_techniques.md                                          # 데이터 로딩 기법 (ISR, Lazy Loading, Infinite Scroll, Skeleton UI)
│   │── svelte_vs_nuxt.md                                                   # Svelte와 Nuxt 비교
│   │── monorepo.md                                                         # monorepo 개념 정리
│   │── yarn-workspace.md                                                   # yarn-workspace 개념
│
│── nuxt/                                                                   # Nuxt 학습 공간
│   │── experiments/                                                        # 실습 프로젝트
│   │── notes/
│── vue/                                                                    # Vue 학습 공간
│   │── experiments/                                                        # 실습 프로젝트
│   │── notes/
│
│── svelte/                                                                 # SvelteKit 학습 공간
│   │── experiments/                                                        # 실습 프로젝트
│   │── notes/
│   │   │── svelte_svelteKit.md                                             # Svelte와 SvelteKit 개념 정리
│   │   │── sveltekit_adapters.md                                           # SvelteKit Adapter 정리
│   │   │── sveltekit_ssr_ssg.md                                            # SvelteKit SSR, SSG 적용
│   │   │── svelte_use_enhance.md                                           # form 태그 use:enhance
│   │── README.md
│
│── vue-editor                                                              # vue editor 개발
│── README.md
```

각 폴더에는 관련 학습 내용을 기록하며, `notes` 폴더는 개념 비교와 정리를 위한 공간입니다.
