# @robonen/eslint

Composable [ESLint](https://eslint.org) flat-config presets.

## Install

```bash
pnpm install -D @robonen/eslint eslint jiti
```

> `jiti` lets ESLint load a TypeScript `eslint.config.ts`.

## Usage

Create `eslint.config.ts` in your project root:

```ts
import { compose, base, typescript, vue, vitest, imports } from '@robonen/eslint';

export default compose(base, typescript, vue, vitest, imports);
```

Append custom config objects after presets to override them:

```ts
import { compose, base, typescript } from '@robonen/eslint';

export default compose(base, typescript, {
  rules: { 'no-console': 'off' },
}, {
  files: ['**/*.vue'],
  rules: { '@stylistic/no-multiple-empty-lines': 'off' },
});
```

## Presets

| Preset       | Plugin(s)                              | Description                                    |
| ------------ | -------------------------------------- | ---------------------------------------------- |
| `base`       | `@eslint/js`, `eslint-plugin-unicorn`  | Core eslint + unicorn rules, global ignores    |
| `typescript` | `typescript-eslint`                    | TypeScript rules (`**/*.ts`, `**/*.vue`)       |
| `vue`        | `eslint-plugin-vue`                    | Vue 3 Composition API / `<script setup>` rules |
| `vitest`     | `@vitest/eslint-plugin`                | Test file rules                                |
| `imports`    | `eslint-plugin-import-x`               | Import rules (cycles, duplicates, ordering)    |
| `node`       | `eslint-plugin-n`                      | Node.js-specific rules                         |
| `stylistic`  | `@stylistic/eslint-plugin`             | Formatting rules                               |

`ignores` is also exported on its own if you only want the global ignore list.

## Migrating from `@robonen/oxlint`

This package replaces `@robonen/oxlint`. The preset names and intent are
preserved, with these mapping notes:

- `eslint/*` rules → ESLint core rules (no prefix), e.g. `eslint/no-console` → `no-console`.
- `typescript/*` → `@typescript-eslint/*`.
- `import/*` → `import-x/*` (via `eslint-plugin-import-x`).
- `node/*` → `n/*` (via `eslint-plugin-n`).
- `@stylistic/*` and `unicorn/*` are unchanged.
- `oxc/*` rules are oxc-exclusive and have **no ESLint equivalent**; they are
  dropped. Their intent is largely covered by `@eslint/js` recommended and
  `unicorn`.
- `categories`/`env`/`ignorePatterns` (oxlint config keys) are replaced by flat
  config equivalents: `@eslint/js` recommended, `languageOptions.globals`, and
  the `ignores` preset.

## API

### `compose(...configs): FlatConfigArray`

Flattens presets (arrays) and inline overrides (single objects) into one ordered
flat config array. Later entries override earlier ones — ESLint flat-config
semantics. Falsy entries (`false`/`null`/`undefined`) are skipped, enabling
conditional composition.
