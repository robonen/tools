# typescript preset

## Purpose

TypeScript-правила для `.ts/.tsx/.mts/.cts` через `overrides`.

## Key Rules

- `typescript/consistent-type-imports`: выносит типы в `import type`.
- `typescript/no-import-type-side-effects`: запрещает сайд-эффекты в type import.
- `typescript/prefer-as-const`.
- `typescript/no-namespace`, `typescript/triple-slash-reference`.
- `typescript/no-wrapper-object-types`: запрещает `String`, `Number`, `Boolean`.

## Examples

```ts
// ✅ Good
import type { User } from './types';

const status = 'ok' as const;
interface Payload {
  value: string;
}

// ❌ Bad
import { User } from './types';

type Boxed = String;
namespace Legacy {
  export const x = 1;
}
```
