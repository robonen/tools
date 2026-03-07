# base preset

## Purpose

Базовый quality-профиль для JS/TS-проектов: корректность, анти-паттерны, безопасные дефолты.

## Key Rules

- `eslint/eqeqeq`: запрещает `==`, требует `===`.
- `eslint/no-unused-vars`: запрещает неиспользуемые переменные (кроме `_name`).
- `eslint/no-eval`, `eslint/no-var`, `eslint/prefer-const`.
- `unicorn/prefer-node-protocol`: требует `node:` для built-in модулей.
- `unicorn/no-thenable`: запрещает thenable-объекты.
- `oxc/*` correctness правила (`bad-comparison-sequence`, `missing-throw` и др.).

## Examples

```ts
// ✅ Good
import { readFile } from 'node:fs/promises';

const id = 42;
if (id === 42) {
  throw new Error('unexpected');
}

// ❌ Bad
import { readFile } from 'fs/promises';

var id = 42;
if (id == '42') {
  throw 'unexpected';
}
```
