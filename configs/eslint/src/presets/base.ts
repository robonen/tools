import type { FlatConfigArray } from '../types';
import js from '@eslint/js';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

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
      'prefer-template': 'warn',
      'no-useless-constructor': 'warn',
      'no-useless-rename': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-throw-literal': 'error',
      'no-return-assign': 'warn',
      'no-else-return': 'warn',
      'no-lonely-if': 'warn',
      'no-unneeded-ternary': 'warn',
      'prefer-object-spread': 'warn',
      'prefer-exponentiation-operator': 'warn',
      'no-useless-computed-key': 'warn',
      'no-useless-concat': 'warn',
      curly: 'off',

      /* ── unicorn ──────────────────────────────────────────── */
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/no-instanceof-builtins': 'error',
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
    },
  },
];
