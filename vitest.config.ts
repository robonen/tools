import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'configs/oxlint/vitest.config.ts',
      'core/stdlib/vitest.config.ts',
      'core/platform/vitest.config.ts',
      'vue/toolkit/vitest.config.ts',
      'vue/primitives/vitest.config.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['core/*', 'vue/*'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
});