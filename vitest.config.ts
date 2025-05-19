import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    workspace: [
      {
        extends: true, 
        test: { 
          environment: 'jsdom', 
        }, 
      }, 
    ],
    coverage: {
      provider: 'v8',
      include: ['core/*', 'web/*'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
});