import type { FlatConfigArray } from '../types';
import tseslint from 'typescript-eslint';

/**
 * TypeScript-specific configuration.
 *
 * Pulls in `typescript-eslint`'s recommended (non type-checked) setup — which
 * registers the parser/plugin and disables core rules superseded by their
 * TypeScript-aware counterparts — then layers opinionated rules on top.
 *
 * `.vue` files are included so the rules apply inside `<script lang="ts">`
 * blocks; the `vue` preset assigns the matching parser for them.
 */
export const typescript: FlatConfigArray = [
  ...tseslint.configs.recommended,
  {
    name: 'robonen/typescript',
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.vue'],
    rules: {
      /* core no-unused-vars is replaced by the TS-aware version */
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      /* TypeScript already reports undefined names; `no-undef` only adds
         false positives (e.g. globals, auto-imports, compiler macros). */
      'no-undef': 'off',

      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-empty-object-type': ['warn', { allowInterfaces: 'with-single-extends' }],
      '@typescript-eslint/no-wrapper-object-types': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-useless-empty-export': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/prefer-function-type': 'warn',
      '@typescript-eslint/ban-tslint-comment': 'error',
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/no-unnecessary-type-constraint': 'warn',
      '@typescript-eslint/adjacent-overload-signatures': 'warn',
      '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',
      '@typescript-eslint/no-namespace': 'error',
    },
  },
];
