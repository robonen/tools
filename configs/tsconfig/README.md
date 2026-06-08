# @robonen/tsconfig

Shared TypeScript configurations.

## Install

```bash
pnpm install -D @robonen/tsconfig
```

## Presets

| Preset | Extends | Use for |
| --- | --- | --- |
| `tsconfig.base.json` | — | Node / isomorphic libraries (`lib: ESNext`, no DOM) |
| `tsconfig.dom.json` | base | Browser libraries (adds `DOM`, `DOM.Iterable`) |
| `tsconfig.vue.json` | dom | Vue SFC libraries / apps (adds `jsx`, `vueCompilerOptions`) |
| `tsconfig.node.json` | base | Build/test tooling files (`*.config.ts`) — adds `types: ["node"]`, no DOM |
| `tsconfig.json` | base | Default alias for `base` (bare `@robonen/tsconfig` import) |

## Usage

Pick the preset that matches the package and extend it:

```jsonc
// Node / isomorphic library
{ "extends": "@robonen/tsconfig/tsconfig.base.json" }
```

```jsonc
// Browser library
{ "extends": "@robonen/tsconfig/tsconfig.dom.json" }
```

```jsonc
// Vue package, with path aliases
{
  "extends": "@robonen/tsconfig/tsconfig.vue.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

> Path aliases resolve relative to the `tsconfig.json` location — `baseUrl` is
> intentionally omitted (deprecated, removed in TypeScript 7.0).

## Project references (DOM + Node split)

Most packages contain two environments: browser/library `src` (DOM) and Node
tooling files (`vite.config.ts`, `vitest.config.ts`, `tsdown.config.ts`). They
are split into separate projects wired with references, so `src` never sees Node
globals and config files never see `DOM`:

```jsonc
// tsconfig.json — solution root, tools (tsdown/vitest/editor) target src below
{
  "files": [],
  "references": [
    { "path": "./tsconfig.src.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

```jsonc
// tsconfig.src.json — the library code
{
  "extends": "@robonen/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "composite": true,
    "types": [],
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.src.tsbuildinfo"
  },
  "include": ["src/**/*.ts"]
}
```

```jsonc
// tsconfig.node.json — build/test tooling files
{
  "extends": "@robonen/tsconfig/tsconfig.node.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo"
  },
  "include": ["*.config.ts"]
}
```

Type-check the whole package (both projects) with `tsc -b` / `vue-tsc -b`.
Point `tsdown` at the src project (`tsconfig: './tsconfig.src.json'`) since the
root has no `compilerOptions`.

## What's included (base)

- **Target / Module**: `ESNext` with `module: Preserve` + `Bundler` resolution
- **Strict mode**: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`
- **Module safety**: `verbatimModuleSyntax`, `isolatedModules`, `moduleDetection: force`
- **Type-check only**: `noEmit` (declarations/output are produced by `tsdown`)
- **Interop**: `esModuleInterop`, `resolveJsonModule`
