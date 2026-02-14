import type { OxlintConfig } from '../types';

/**
 * Vitest rules for test files.
 *
 * Applied via `overrides` for common test file patterns.
 */
export const vitest: OxlintConfig = {
  plugins: ['vitest'],

  overrides: [
    {
      files: [
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        '**/test/**/*.{ts,tsx,js,jsx}',
        '**/__tests__/**/*.{ts,tsx,js,jsx}',
      ],
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
        'eslint/no-unused-vars': 'off',
        'typescript/no-explicit-any': 'off',
      },
    },
  ],
};
