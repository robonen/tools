import type { OxlintConfig } from '../types';

/**
 * TypeScript-specific rules.
 *
 * Applied via `overrides` for `*.ts`, `*.tsx`, `*.mts`, `*.cts` files.
 */
export const typescript: OxlintConfig = {
  plugins: ['typescript'],

  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
      rules: {
        'typescript/consistent-type-imports': 'error',
        'typescript/no-explicit-any': 'off',
        'typescript/no-non-null-assertion': 'off',
        'typescript/prefer-as-const': 'error',
        'typescript/no-empty-object-type': 'warn',
        'typescript/no-wrapper-object-types': 'error',
        'typescript/no-duplicate-enum-values': 'error',
        'typescript/no-unsafe-declaration-merging': 'error',
        'typescript/no-import-type-side-effects': 'error',
        'typescript/no-useless-empty-export': 'warn',
        'typescript/no-inferrable-types': 'warn',
        'typescript/prefer-function-type': 'warn',
        'typescript/ban-tslint-comment': 'error',
        'typescript/consistent-type-definitions': ['warn', 'interface'],
        'typescript/prefer-for-of': 'warn',
        'typescript/no-unnecessary-type-constraint': 'warn',
        'typescript/adjacent-overload-signatures': 'warn',
        'typescript/array-type': ['warn', { default: 'array-simple' }],
        'typescript/no-this-alias': 'error',
        'typescript/triple-slash-reference': 'error',
        'typescript/no-namespace': 'error',
      },
    },
  ],
};
