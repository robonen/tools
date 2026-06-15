import type { FlatConfigArray } from '../types';

/**
 * Relaxations for test, spec and benchmark files — the type-boundary carve-outs
 * that test scaffolding legitimately needs, applied uniformly across every
 * package.
 *
 * Tests stub globals (`(globalThis as any).x`), cast `vi.fn()` mocks, build
 * throwaway fixtures and keep deliberate sink variables; benchmarks pre-size
 * arrays with `new Array(n)`. The `vitest` preset already grants these for its
 * own (`it`/`expect`) ruleset, but most packages don't adopt that preset (their
 * tests use string `describe` titles), so this small overlay carries just the
 * relaxations — no vitest-specific style rules — and is meant to be composed
 * LAST so it wins over the `typescript`/`stylistic` presets for these files.
 *
 * Source `any` is unaffected: it stays at `warn` everywhere else.
 */
export const tests: FlatConfigArray = [
  {
    name: 'robonen/tests',
    files: [
      '**/*.{test,spec,bench}.{ts,tsx,cts,mts,js,jsx,cjs,mjs}',
      '**/test/**/*.{ts,tsx,js,jsx}',
      '**/__test__/**/*.{ts,tsx,js,jsx}',
      '**/__tests__/**/*.{ts,tsx,js,jsx}',
    ],
    rules: {
      /* Test scaffolding inspects/stubs untyped boundaries; `any` is idiomatic here. */
      '@typescript-eslint/no-explicit-any': 'off',
      /* Sink variables, partially-used fixtures and `_`-less throwaways are fine in tests. */
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      /* Benchmarks legitimately pre-size arrays (`new Array(n)`) for fixtures. */
      'unicorn/no-new-array': 'off',
      /* Empty mock/fixture classes (e.g. stubbing `class DeviceOrientationEvent {}`). */
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
