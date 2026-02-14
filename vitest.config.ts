import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'configs/oxlint/vitest.config.ts',
      'core/stdlib/vitest.config.ts',
      'core/platform/vitest.config.ts',
      'web/vue/vitest.config.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['core/*', 'web/*'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
});