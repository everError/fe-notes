/// <reference types='vitest' />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { resolve } from 'path';

export default defineConfig(() => ({
  server: {
    port: 5173,
    host: 'localhost',
  },
  plugins: [vue()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ide-demo/shared': resolve(__dirname, '../../libs/shared/src/index.ts'),
      '@ide-demo/editor': resolve(__dirname, '../../libs/editor/src/index.ts'),
    },
  },
}));
