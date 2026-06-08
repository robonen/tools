import type { FlatConfigArray } from '../types';
import vitestPlugin from '@vitest/eslint-plugin';

/**
 * Vitest configuration for test files.
 *
 * Scoped to common test file patterns. Adopts the plugin's full `recommended`
 * ruleset, layers extra preference rules at `error`, and relaxes a few strict
 * rules that are noisy in tests.
 */
export const vitest: FlatConfigArray = [
  {
    name: 'robonen/vitest',
    files: [
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/test/**/*.{ts,tsx,js,jsx}',
      '**/__tests__/**/*.{ts,tsx,js,jsx}',
    ],
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,

      /* House convention: `describe(useX, …)` / `it(fn, …)` pass a FUNCTION as the
         title (nicer reporter output) — valid-title only accepts strings. */
      'vitest/valid-title': 'off',
      /* Niche stylistic preference; the explicit two-assertion form is clearer. */
      'vitest/prefer-called-exactly-once-with': 'off',

      'vitest/no-import-node-test': 'error',
      'vitest/no-conditional-tests': 'error',
      'vitest/prefer-to-be-truthy': 'error',
      'vitest/prefer-to-be-falsy': 'error',
      'vitest/prefer-to-be-object': 'error',
      'vitest/prefer-to-have-length': 'error',
      'vitest/consistent-test-filename': 'error',
      'vitest/prefer-describe-function-title': 'error',

      /* relax strict rules in tests */
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      /* Empty mock/fixture classes (e.g. stubbing `class DeviceOrientationEvent {}`). */
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
