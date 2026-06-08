import type { FlatConfigArray } from '../types';
import js from '@eslint/js';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import { regexp } from './regexp';

/**
 * Globally ignored paths — build output, coverage, generated artifacts.
 *
 * A flat config entry with only `ignores` acts as a global ignore.
 */
export const ignores: FlatConfigArray = [
  {
    name: 'robonen/ignores',
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/storybook-static/**',
      '**/*.min.*',
    ],
  },
];

/**
 * Base configuration for any JavaScript/TypeScript project.
 *
 * Includes `@eslint/js` recommended rules (the analog of oxlint's
 * `correctness` category) plus opinionated `eslint` core and `unicorn` rules.
 *
 * > Note: oxlint's `oxc/*` rules have no ESLint equivalent and are dropped in
 * > this migration; their intent is largely covered by `@eslint/js` recommended
 * > and `unicorn`.
 */
export const base: FlatConfigArray = [
  ...ignores,
  {
    name: 'robonen/base/setup',
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.es2024,
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  {
    name: 'robonen/base/rules',
    plugins: {
      unicorn,
    },
    rules: {
      /* ── eslint core ──────────────────────────────────────── */
      eqeqeq: 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'no-throw-literal': 'error',
      'no-return-assign': 'error',
      'no-else-return': 'error',
      'no-lonely-if': 'error',
      'no-unneeded-ternary': 'error',
      'prefer-object-spread': 'error',
      'prefer-exponentiation-operator': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      'no-array-constructor': 'error',
      'no-new-wrappers': 'error',
      'no-useless-return': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-spread': 'error',
      'prefer-rest-params': 'error',
      'symbol-description': 'error',
      curly: 'off',

      /* ── unicorn ──────────────────────────────────────────── */
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/no-instanceof-builtins': 'error',
      'unicorn/no-new-array': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/throw-new-error': 'error',
      'unicorn/error-message': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/prefer-type-error': 'error',
      'unicorn/no-thenable': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-global-this': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-modern-math-apis': 'error',
      'unicorn/prefer-negative-index': 'error',
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/no-typeof-undefined': 'error',
      'unicorn/no-array-push-push': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
    },
  },
  ...regexp,
];
