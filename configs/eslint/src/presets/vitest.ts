import type { FlatConfigArray } from '../types';
import vitestPlugin from '@vitest/eslint-plugin';

/**
 * Vitest configuration for test files.
 *
 * Scoped to common test file patterns; also relaxes a few strict rules that
 * are noisy in tests.
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
      'vitest/no-conditional-tests': 'warn',
      'vitest/no-import-node-test': 'error',
      'vitest/prefer-to-be-truthy': 'warn',
      'vitest/prefer-to-be-falsy': 'warn',
      'vitest/prefer-to-be-object': 'warn',
      'vitest/prefer-to-have-length': 'warn',
      'vitest/consistent-test-filename': 'warn',
      'vitest/prefer-describe-function-title': 'warn',

      /* relax strict rules in tests */
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
