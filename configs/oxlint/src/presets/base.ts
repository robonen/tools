import type { OxlintConfig } from '../types';

/**
 * Base configuration for any JavaScript/TypeScript project.
 *
 * Enables `correctness` category and opinionated rules from
 * `eslint`, `oxc`, and `unicorn` plugins.
 */
export const base: OxlintConfig = {
  plugins: ['eslint', 'oxc', 'unicorn'],

  categories: {
    correctness: 'error',
  },

  rules: {
    /* ── eslint core ──────────────────────────────────────── */
    'eslint/eqeqeq': 'error',
    'eslint/no-console': 'warn',
    'eslint/no-debugger': 'error',
    'eslint/no-eval': 'error',
    'eslint/no-var': 'error',
    'eslint/prefer-const': 'error',
    'eslint/prefer-template': 'warn',
    'eslint/no-useless-constructor': 'warn',
    'eslint/no-useless-rename': 'warn',
    'eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'eslint/no-self-compare': 'error',
    'eslint/no-template-curly-in-string': 'warn',
    'eslint/no-throw-literal': 'error',
    'eslint/no-return-assign': 'warn',
    'eslint/no-else-return': 'warn',
    'eslint/no-lonely-if': 'warn',
    'eslint/no-unneeded-ternary': 'warn',
    'eslint/prefer-object-spread': 'warn',
    'eslint/prefer-exponentiation-operator': 'warn',
    'eslint/no-useless-computed-key': 'warn',
    'eslint/no-useless-concat': 'warn',
    'eslint/curly': 'off',

    /* ── unicorn ──────────────────────────────────────────── */
    'unicorn/prefer-node-protocol': 'error',
    'unicorn/no-instanceof-array': 'error',
    'unicorn/no-new-array': 'error',
    'unicorn/prefer-array-flat-map': 'warn',
    'unicorn/prefer-array-flat': 'warn',
    'unicorn/prefer-includes': 'warn',
    'unicorn/prefer-string-slice': 'warn',
    'unicorn/prefer-string-starts-ends-with': 'warn',
    'unicorn/throw-new-error': 'error',
    'unicorn/error-message': 'warn',
    'unicorn/no-useless-spread': 'warn',
    'unicorn/no-useless-undefined': 'off',
    'unicorn/prefer-optional-catch-binding': 'warn',
    'unicorn/prefer-type-error': 'warn',
    'unicorn/no-thenable': 'error',
    'unicorn/prefer-number-properties': 'warn',
    'unicorn/prefer-global-this': 'warn',

    /* ── oxc ──────────────────────────────────────────────── */
    'oxc/no-accumulating-spread': 'warn',
    'oxc/bad-comparison-sequence': 'error',
    'oxc/bad-min-max-func': 'error',
    'oxc/bad-object-literal-comparison': 'error',
    'oxc/const-comparisons': 'error',
    'oxc/double-comparisons': 'error',
    'oxc/erasing-op': 'error',
    'oxc/missing-throw': 'error',
    'oxc/bad-bitwise-operator': 'error',
    'oxc/bad-char-at-comparison': 'error',
    'oxc/bad-replace-all-arg': 'error',
  },
};
