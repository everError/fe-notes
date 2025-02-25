import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import VueRouter from 'unplugin-vue-router/vite';

export class VitePlugin {
  private readonly __dirname: string;
  constructor(dirname: string) {
    this.__dirname = dirname;
    // Vue Must be placed after VueRouter()
    this.plugins = [
      VueRouter({
        /* options */
      }),
      // ⚠️ Vue must be placed after VueRouter()
      vue(),
      tailwindcss(),
    ];
    this.resolve = {
      alias: {
        '@': '/src',
        '@shared': path.resolve(this.__dirname, '../shared/src'),
        '@comp': path.resolve(this.__dirname, '../shared/src/components'),
        '@def': path.resolve(this.__dirname, '../shared/src/defines'),
        '@modules': path.resolve(this.__dirname, '../shared/src/modules'),
        '@stores': path.resolve(this.__dirname, '../shared/src/stores'),
      },
    };
  }
  public readonly plugins;
  public readonly resolve;
}
