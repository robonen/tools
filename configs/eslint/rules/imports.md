# imports preset

## Purpose

Чистые границы модулей и предсказуемые импорты (через `eslint-plugin-import-x`).

## Key Rules

- `import-x/no-duplicates`.
- `import-x/no-self-import`.
- `import-x/no-cycle` (warn).
- `import-x/no-mutable-exports`.
- `import-x/consistent-type-specifier-style`: `prefer-top-level`.

## Examples

```ts
// ✅ Good
import type { User } from './types';
import { getUser } from './service';

// ❌ Bad
import { getUser } from './service';
import { getUser as getUser2 } from './service';

export let state = 0;
```
