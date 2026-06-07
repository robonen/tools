import { resolve } from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import Vue from 'unplugin-vue/vite';
import { defineConfig } from 'vitest/config';

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
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
});
