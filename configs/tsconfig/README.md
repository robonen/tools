# @robonen/tsconfig

Shared base TypeScript configuration.

## Install

```bash
pnpm install -D @robonen/tsconfig
```

## Usage

Extend from it in your `tsconfig.json`:

```json
{
  "extends": "@robonen/tsconfig/tsconfig.json"
}
```

## What's Included

- **Target / Module**: ESNext with Bundler resolution
- **Strict mode**: `strict`, `noUncheckedIndexedAccess`
- **Module safety**: `verbatimModuleSyntax`, `isolatedModules`
- **Declarations**: `declaration` enabled
- **Interop**: `esModuleInterop`, `allowJs`, `resolveJsonModule`
