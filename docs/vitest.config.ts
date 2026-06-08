import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only the build-time tooling (extractor / MCP server) is unit-tested here;
    // the Nuxt app itself is covered elsewhere.
    include: ['modules/**/*.test.ts'],
    environment: 'node',
  },
});
