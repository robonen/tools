import type { FlatConfigArray } from '../types';
import importX, { createNodeResolver } from 'eslint-plugin-import-x';

/**
 * Import configuration for clean module boundaries.
 *
 * Uses `eslint-plugin-import-x` (the faster, modern fork) under the `import-x`
 * namespace, plus the core `sort-imports` rule. The Node resolver is configured
 * explicitly (flat config no longer ships a default) with TypeScript/Vue-aware
 * extensions so resolution-based rules (`no-cycle`, `no-self-import`) work.
 */
export const imports: FlatConfigArray = [
  {
    name: 'robonen/imports',
    plugins: {
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [
        createNodeResolver({
          extensions: ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts', '.vue', '.json', '.node'],
        }),
      ],
    },
    rules: {
      'import-x/no-duplicates': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-cycle': 'error',
      'import-x/first': 'error',
      'import-x/no-mutable-exports': 'error',
      'import-x/no-amd': 'error',
      'import-x/no-commonjs': 'error',
      'import-x/no-empty-named-blocks': 'error',
      'import-x/no-useless-path-segments': ['error', { noUselessIndex: false }],
      'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],

      /* Only enforce member order within `{ … }`; declaration order is sorted
         by source path across the codebase, which core `sort-imports` (orders
         by first member name) would otherwise fight. Kept at `warn` — it is not
         autofixable and member order is a soft preference. */
      'sort-imports': ['warn', { ignoreDeclarationSort: true }],
    },
  },
  {
    /* Vue SFCs may have two <script> blocks (`<script>` + `<script setup>`),
       which the parser concatenates — `import-x/first` then wrongly flags the
       second block's imports as out of place. Kept here (rather than in the
       `vue` preset) so it wins regardless of preset composition order. */
    name: 'robonen/imports/vue',
    files: ['**/*.vue'],
    rules: {
      'import-x/first': 'off',
    },
  },
];
