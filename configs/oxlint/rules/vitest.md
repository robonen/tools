# vitest preset

## Purpose

Правила для тестов (`*.test.*`, `*.spec.*`, `test/**`, `__tests__/**`).

## Key Rules

- `vitest/no-conditional-tests`.
- `vitest/no-import-node-test`.
- `vitest/prefer-to-be-truthy`, `vitest/prefer-to-be-falsy`.
- `vitest/prefer-to-have-length`.
- Relaxations: `eslint/no-unused-vars` и `typescript/no-explicit-any` выключены для тестов.

## Examples

```ts
// ✅ Good
import { describe, it, expect } from 'vitest';

describe('list', () => {
  it('has items', () => {
    expect([1, 2, 3]).toHaveLength(3);
    expect(true).toBeTruthy();
  });
});

// ❌ Bad
if (process.env.CI) {
  it('conditionally runs', () => {
    expect(true).toBe(true);
  });
}
```
