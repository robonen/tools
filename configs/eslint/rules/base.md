# base preset

## Purpose

Базовый quality-профиль для JS/TS-проектов: корректность, анти-паттерны, безопасные дефолты. Включает `@eslint/js` recommended (аналог oxlint-категории `correctness`) + правила `unicorn`.

## Key Rules

- `eqeqeq`: запрещает `==`, требует `===`.
- `no-unused-vars`: запрещает неиспользуемые переменные (кроме `_name`).
- `no-eval`, `no-var`, `prefer-const`.
- `unicorn/prefer-node-protocol`: требует `node:` для built-in модулей.
- `unicorn/no-thenable`: запрещает thenable-объекты.

> Правила `oxc/*` из `@robonen/oxlint` не имеют аналога в ESLint и были убраны;
> их назначение покрывается `@eslint/js` recommended и `unicorn`.

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
