import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './app/App.vue';
import { createWeb } from '@ide-demo/shared';
import './styles.css';
// TODO: 라이브러리 import (경로는 모노레포 구조에 맞게)
import { AButton, AInputText /* ... */ } from '@ide-demo/shared';

import './assets/canvas.css';
import { InputText } from 'primevue';

const app = createApp(App);

app.use(createPinia());
app.use(
  createWeb({
    apiBaseUrl: '',
  }),
);

// TOOD:
// 에디터에서 동적으로 쓰려면 전역 등록이 필요함
app.component('AButton', AButton);
// 나머지 컴포넌트도 동일하게 등록
// TODO: PrimeVue 컴포넌트들 등록
app.component('InputText', InputText);
app.mount('#app');
