import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
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
