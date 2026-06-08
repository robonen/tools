import { resolve } from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import Vue from 'unplugin-vue/vite';
import { defineConfig } from 'vitest/config';

const alias = { '@': resolve(__dirname, './src') };

export default defineConfig({
  plugins: [Vue()],
  define: {
    __DEV__: 'true',
  },
  resolve: { alias },
  test: {
    projects: [
      {
        // Pure logic: model, schema, registry, state, commands.
        extends: true,
        test: {
          name: 'logic',
          environment: 'jsdom',
          include: ['src/**/*.test.ts'],
          exclude: ['src/view/**', 'src/keymap/**'],
        },
      },
      {
        // DOM-heavy: view rendering, selection, hotkeys.
        extends: true,
        test: {
          name: 'view',
          include: ['src/view/**/*.test.ts', 'src/keymap/**/*.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
