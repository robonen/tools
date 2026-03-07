# imports preset

## Purpose

Чистые границы модулей и предсказуемые импорты.

## Key Rules

- `import/no-duplicates`.
- `import/no-self-import`.
- `import/no-cycle` (warn).
- `import/no-mutable-exports`.
- `import/consistent-type-specifier-style`: `prefer-top-level`.

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
