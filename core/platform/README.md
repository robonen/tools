# @robonen/platform

Platform-dependent utilities for browser & multi-runtime environments.

## Install

```bash
pnpm install @robonen/platform
```

## Modules

| Entry              | Utilities     | Description                      |
| ------------------ | ------------- | -------------------------------- |
| `@robonen/platform/browsers` | `focusGuard`  | Browser-specific helpers         |
| `@robonen/platform/multi`    | `global`      | Cross-runtime (Node/Bun/Deno) utilities |

## Usage

```ts
import { focusGuard } from '@robonen/platform/browsers';
import { global } from '@robonen/platform/multi';
```