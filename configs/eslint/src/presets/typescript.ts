import type { FlatConfigArray } from '../types';
import tseslint from 'typescript-eslint';

/**
 * TypeScript-specific configuration.
 *
 * Adopts `typescript-eslint`'s **strict** (non type-checked) ruleset plus the
 * **stylistic** ruleset — registering the parser/plugin, disabling core rules
 * superseded by TS-aware counterparts, and enforcing the full strict + stylistic
 * sets at `error`. A small overlay re-tunes a few rules for this monorepo.
 *
 * Two deliberate carve-outs: `no-explicit-any` is kept at `warn` (the low-level
 * stdlib/toolkit does a lot of type-boundary work where `any` is idiomatic), and
 * `no-non-null-assertion` is `off` (the `!` operator is how the codebase satisfies
 * `noUncheckedIndexedAccess` on provably-bounded indexed access).
 *
 * `.vue` files are included so the rules apply inside `<script lang="ts">`
 * blocks; the `vue` preset assigns the matching parser for them.
 */
export const typescript: FlatConfigArray = [
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
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

      /* Deliberate carve-outs from `strict` (see file header). */
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      /* noop/default callbacks (`() => {}`) are an intentional, pervasive pattern. */
      '@typescript-eslint/no-empty-function': 'off',
      /* The libraries expose deliberate overload signatures (better inference/DX
         than a single union signature) — don't force-merge them. */
      '@typescript-eslint/unified-signatures': 'off',
      /* Plain objects are used as keyed dictionaries (e.g. forms errors/touched
         maps) where dynamic `delete` is legitimate. */
      '@typescript-eslint/no-dynamic-delete': 'off',
      /* Index-based `for` loops are sometimes a deliberate perf choice; this rule
         is not autofixable and converting can subtly change semantics. */
      '@typescript-eslint/prefer-for-of': 'off',
      /* Idiomatic callback return unions (`() => void | false`, `() => void |
         Promise<T>`) are pervasive in composables; the rule is hostile to them. */
      '@typescript-eslint/no-invalid-void-type': 'off',

      /* Allow our type-helper interfaces that extend a single mapped type. */
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],

      /* House preferences (override the strict/stylistic defaults' options). */
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-useless-empty-export': 'error',
    },
  },
];
