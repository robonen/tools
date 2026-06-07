# typescript preset

## Purpose

TypeScript-правила для `.ts/.tsx/.mts/.cts` и `<script lang="ts">` в `.vue`. Базируется на `typescript-eslint` recommended (без type-checking).

## Key Rules

- `@typescript-eslint/consistent-type-imports`: выносит типы в `import type`.
- `@typescript-eslint/no-import-type-side-effects`: запрещает сайд-эффекты в type import.
- `@typescript-eslint/prefer-as-const`.
- `@typescript-eslint/no-namespace`, `@typescript-eslint/triple-slash-reference`.
- `@typescript-eslint/no-wrapper-object-types`: запрещает `String`, `Number`, `Boolean`.

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
