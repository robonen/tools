import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Type tests (*.test-d.ts) are statically analyzed with `tsc --noEmit`
    // alongside the runtime suite.
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.src.json',
    },
  },
});
