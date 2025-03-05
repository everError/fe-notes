import { defineConfig } from 'vite';
import { VitePlugin } from '../shared/src/plugins/vite-plugin';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
var viteConfig = new VitePlugin(__dirname);

export default defineConfig({
  plugins: viteConfig.plugins,
  resolve: viteConfig.resolve,
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5290/',
        changeOrigin: true,
      },
    },
    host: '0.0.0.0',
    port: 3000,
  },
});
