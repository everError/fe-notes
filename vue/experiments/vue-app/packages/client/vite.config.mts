import { defineConfig } from 'vite';
import { VitePlugin } from '../shared/src/plugins/vite-plugin';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
var viteConfig = new VitePlugin(__dirname);

export default defineConfig({
  plugins: viteConfig.plugins,
  resolve: viteConfig.resolve,
  // css: viteCss,
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5290/',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:5290/',
        changeOrigin: true,
        ws: true,
      },
    },
    host: '0.0.0.0', // 모든 IP에서 접근 가능하도록 설정
    port: 3000,
  },
});
