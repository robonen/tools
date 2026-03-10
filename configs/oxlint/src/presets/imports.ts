import type { OxlintConfig } from '../types';

/**
 * Import plugin rules for clean module boundaries.
 */
export const imports: OxlintConfig = {
  plugins: ['import'],

  rules: {
    'import/no-duplicates': 'error',
    'import/no-self-import': 'error',
    'import/no-cycle': 'warn',
    'import/first': 'warn',
    'import/no-mutable-exports': 'error',
    'import/no-amd': 'error',
    'import/no-commonjs': 'warn',
    'import/no-empty-named-blocks': 'warn',
    'import/consistent-type-specifier-style': ['warn', 'prefer-top-level'],

    'sort-imports': 'warn',
  },
};
