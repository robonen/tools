---
name: monorepo
description: "Manage the @robonen/tools monorepo. Use when: installing dependencies, creating new packages, linting, building, testing, publishing, or scaffolding workspace packages. Covers pnpm catalogs, tsdown builds, oxlint presets, vitest projects, JSR/NPM publishing."
---

# Monorepo Management

## Overview

This is a pnpm workspace monorepo (`@robonen/tools`) with shared configs, strict dependency management via catalogs, and automated publishing.

## Workspace Layout

| Directory | Purpose | Examples |
|-----------|---------|---------|
| `configs/*` | Shared tooling configs | `oxlint`, `tsconfig`, `tsdown` |
| `core/*` | Platform-agnostic TS libraries | `stdlib`, `platform`, `encoding` |
| `vue/*` | Vue 3 packages | `primitives`, `toolkit` |
| `docs` | Nuxt 4 documentation site | — |
| `infra/*` | Infrastructure configs | `renovate` |

## Installing Dependencies

**Always use pnpm. Never use npm or yarn.**

### Add a dependency to a specific package

```bash
# Runtime dependency
pnpm -C <package-path> add <dep-name>

# Dev dependency
pnpm -C <package-path> add -D <dep-name>
```

Examples:
```bash
pnpm -C core/stdlib add -D oxlint
pnpm -C vue/primitives add vue
```

### Use catalogs for shared versions

Versions shared across multiple packages MUST use the pnpm catalog system. The catalog is defined in `pnpm-workspace.yaml`:

```yaml
catalog:
  vitest: ^4.0.18
  tsdown: ^0.21.0
  oxlint: ^1.2.0
  vue: ^3.5.28
  # ... etc
```

In `package.json`, reference catalog versions with the `catalog:` protocol:
```json
{
  "devDependencies": {
    "vitest": "catalog:",
    "oxlint": "catalog:"
  }
}
```

**When to add to catalog:** If the dependency is used in 2+ packages, add it to `pnpm-workspace.yaml` under `catalog:` and use `catalog:` in each `package.json`.

**When NOT to use catalog:** Package-specific dependencies used in only one package (e.g., `citty` in root).

### Internal workspace dependencies

Reference sibling packages with the workspace protocol:
```json
{
  "devDependencies": {
    "@robonen/oxlint": "workspace:*",
    "@robonen/tsconfig": "workspace:*",
    "@robonen/tsdown": "workspace:*"
  }
}
```

Nearly every package depends on these three shared config packages.

### After installing

Always run `pnpm install` at the root after editing `pnpm-workspace.yaml` or any `package.json` manually.

## Creating a New Package

> **Note:** The existing `bin/cli.ts` (`pnpm create`) is outdated — it generates Vite configs instead of tsdown and lacks oxlint/vitest setup. Follow the manual steps below instead.

### 1. Create the directory

Choose the correct parent based on package type:
- `core/<name>` — Platform-agnostic TypeScript library
- `vue/<name>` — Vue 3 library (needs jsdom, vue deps)
- `configs/<name>` — Shared configuration package

### 2. Create `package.json`

```json
{
  "name": "@robonen/<name>",
  "version": "0.0.1",
  "license": "Apache-2.0",
  "description": "",
  "packageManager": "pnpm@10.29.3",
  "engines": { "node": ">=24.13.1" },
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "lint:check": "oxlint -c oxlint.config.ts",
    "lint:fix": "oxlint -c oxlint.config.ts --fix",
    "test": "vitest run",
    "dev": "vitest dev",
    "build": "tsdown"
  },
  "devDependencies": {
    "@robonen/oxlint": "workspace:*",
    "@robonen/tsconfig": "workspace:*",
    "@robonen/tsdown": "workspace:*",
      "@stylistic/eslint-plugin": "catalog:",
    "oxlint": "catalog:",
    "tsdown": "catalog:"
  }
}
```

For Vue packages, also add:
```json
{
  "dependencies": {
    "vue": "catalog:",
    "@vue/shared": "catalog:"
    "@stylistic/eslint-plugin": "catalog:",
  },
  "devDependencies": {
    "@vue/test-utils": "catalog:"
  }
}
```

For packages with sub-path exports (like `core/platform`):
```json
{
  "exports": {
    "./browsers": {
      "types": "./dist/browsers.d.ts",
      "import": "./dist/browsers.js",
      "require": "./dist/browsers.cjs"
    }
  }
}
```

### 3. Create `tsconfig.json`

Node/core package:
```json
{
  "extends": "@robonen/tsconfig/tsconfig.json"
}
```

Vue package (needs DOM types and path aliases):
```json
{
  "extends": "@robonen/tsconfig/tsconfig.json",
  "compilerOptions": {
    "lib": ["DOM"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

### 4. Create `tsdown.config.ts`

Standard:
```typescript
import { defineConfig } from 'tsdown';
import { sharedConfig } from '@robonen/tsdown';

export default defineConfig({
  ...sharedConfig,
  entry: ['src/index.ts'],
});
```

Vue package (externalize vue, bundle internal deps):
```typescript
import { defineConfig } from 'tsdown';
import { sharedConfig } from '@robonen/tsdown';

export default defineConfig({
  ...sharedConfig,
  entry: ['src/index.ts'],
  deps: {
    neverBundle: ['vue'],
    alwaysBundle: [/^@robonen\//, '@vue/shared'],
  },
  inputOptions: {
    resolve: {
      alias: { '@vue/shared': '@vue/shared/dist/shared.esm-bundler.js' },
    },
  },
  define: { __DEV__: 'false' },
});
```

### 5. Create `oxlint.config.ts`

Standard (node packages):
```typescript
import { defineConfig } from 'oxlint';
import { compose, base, typescript, imports, stylistic } from '@robonen/oxlint';

export default defineConfig(compose(base, typescript, imports, stylistic));
```

### 6. Create `vitest.config.ts`

Node package:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

Vue package:
```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  define: { __DEV__: 'true' },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
  },
});
```

### 7. Create `jsr.json` (for publishable packages)

```json
{
  "$schema": "https://jsr.io/schema/config-file.v1.json",
  "name": "@robonen/<name>",
  "version": "0.0.1",
  "exports": "./src/index.ts"
}
```

### 8. Create source files

```bash
mkdir -p src
touch src/index.ts
```

### 9. Register with vitest projects

Add the new `vitest.config.ts` path to the root `vitest.config.ts` `projects` array.

### 10. Install dependencies

```bash
pnpm install
```

### 11. Verify

```bash
pnpm -C <package-path> build
pnpm -C <package-path> lint
pnpm -C <package-path> test
```

## Linting

Uses **oxlint** (not ESLint) with composable presets from `@robonen/oxlint`.

### Run linting

```bash
# Check lint errors (no auto-fix)
pnpm -C <package-path> lint:check

# Auto-fix lint errors
pnpm -C <package-path> lint:fix

# Check all packages
pnpm lint:check

# Fix all packages
pnpm lint:fix
```

### Available presets

| Preset | Purpose |
|--------|---------|
| `base` | ESLint core + Oxc + Unicorn rules |
| `typescript` | TypeScript rules (via overrides on `*.ts` files) |
| `imports` | Import ordering, cycles, duplicates |
| `stylistic` | Code style via `@stylistic/eslint-plugin` |
| `vue` | Vue 3 Composition API rules |
| `vitest` | Test file rules |
| `node` | Node.js-specific rules |

Compose presets in `oxlint.config.ts`:
```typescript
import { defineConfig } from 'oxlint';
import { compose, base, typescript, imports } from '@robonen/oxlint';

export default defineConfig(compose(base, typescript, imports));

**Recommended:** Include `stylistic` preset for code formatting:
```typescript
import { defineConfig } from 'oxlint';
import { compose, base, typescript, imports, stylistic } from '@robonen/oxlint';

export default defineConfig(compose(base, typescript, imports, stylistic));
```

When using `stylistic`, add `@stylistic/eslint-plugin` to devDependencies:
```json
{
  "devDependencies": {
    "@stylistic/eslint-plugin": "catalog:"
  }
}
```
```

## Building

```bash
# Build a specific package
pnpm -C <package-path> build

# Build all packages
pnpm build
```

All packages use `tsdown` with shared config from `@robonen/tsdown`. Output: ESM (`.js`/`.mjs`) + CJS (`.cjs`) + type declarations (`.d.ts`). Every bundle includes an Apache-2.0 license banner.

## Testing

```bash
# Run tests in a specific package
pnpm -C <package-path> test

# Run all tests (via vitest projects)
pnpm test

# Interactive test UI
pnpm test:ui

# Watch mode in a package
pnpm -C <package-path> dev
```

Uses **vitest** with project-based configuration. Root `vitest.config.ts` lists all package vitest configs as projects.

## Publishing

Publishing is **automated** via GitHub Actions on push to `master`:

1. CI builds and tests all packages
2. Publish workflow compares each package's `version` in `package.json` against npm registry
3. If version changed → `pnpm publish --access public`

**To publish:** Bump the `version` in `package.json` (and `jsr.json` if present), then merge to `master`.

**NPM scope:** All packages publish under `@robonen/`.

## Documentation

```bash
pnpm docs:dev      # Start Nuxt dev server
pnpm docs:generate  # Generate static site
pnpm docs:preview   # Preview generated site
pnpm docs:extract   # Extract API docs
```

## Key Conventions

- **ESM-first:** All packages use `"type": "module"`
- **Strict TypeScript:** `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`
- **License:** Apache-2.0 for all published packages
- **Node version:** ≥24.13.1 (set in `engines` and CI)
- **pnpm version:** Pinned in `packageManager` field
- **No barrel re-exports of entire modules** — export explicitly
- **`__DEV__` global:** `false` in builds, `true` in tests (Vue packages only)
