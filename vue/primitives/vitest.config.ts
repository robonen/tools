import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import Vue from 'unplugin-vue/vite';

export default defineConfig({
  plugins: [Vue()],
  define: {
    __DEV__: 'true',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
