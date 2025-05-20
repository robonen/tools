import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          typecheck: {
            enabled: false,
          },
        },
      },
    ],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['core/*', 'web/*'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
});