/// <reference types='vitest' />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ide-demo/shared': resolve(__dirname, '../../libs/shared/src/index.ts'),
      '@ide-demo/editor': resolve(__dirname, '../../libs/editor/src/index.ts'),
    },
  },
  server: {
    port: 5174, // ide는 5173, canvas-app은 5174
    proxy: {
      '/std': {
        target: 'http://localhost:5066/',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:5010/',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
