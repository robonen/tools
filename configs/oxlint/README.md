# @robonen/oxlint

Composable [oxlint](https://oxc.rs/docs/guide/usage/linter.html) configuration presets.

## Install

```bash
pnpm install -D @robonen/oxlint oxlint
```

## Usage

Create `oxlint.config.ts` in your project root:

```ts
import { defineConfig } from 'oxlint';
import { compose, base, typescript, vue, vitest, imports } from '@robonen/oxlint';

export default defineConfig(
  compose(base, typescript, vue, vitest, imports),
);
```

Append custom rules after presets to override them:

```ts
compose(base, typescript, {
  rules: { 'eslint/no-console': 'off' },
  ignorePatterns: ['dist'],
});
```

## Presets

| Preset       | Description                                        |
| ------------ | -------------------------------------------------- |
| `base`       | Core eslint, oxc, unicorn rules                    |
| `typescript` | TypeScript-specific rules (via overrides)           |
| `vue`        | Vue 3 Composition API / `<script setup>` rules     |
| `vitest`     | Test file rules (via overrides)                    |
| `imports`    | Import rules (cycles, duplicates, ordering)        |
| `node`       | Node.js-specific rules                             |

## Rules Documentation

Подробные описания правил и `good/bad` примеры вынесены в отдельную директорию:

- `rules/README.md`
- `rules/base.md`
- `rules/typescript.md`
- `rules/vue.md`
- `rules/vitest.md`
- `rules/imports.md`
- `rules/node.md`
- `rules/stylistic.md`

## API

### `compose(...configs: OxlintConfig[]): OxlintConfig`

Merges multiple configs into one:

- **plugins** — union (deduplicated)
- **rules / categories** — last wins
- **overrides / ignorePatterns** — concatenated
- **env / globals** — shallow merge
- **settings** — deep merge
