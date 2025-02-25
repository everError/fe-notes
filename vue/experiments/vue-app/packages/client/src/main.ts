import { createApp } from 'vue';
import App from './App.vue';
import '@shared/assets/tailwind.css';
import { initApp } from '@shared/plugins/web-plugin';

const app = createApp(App);
initApp(app);
app.mount('#app');
