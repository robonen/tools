# node preset

## Purpose

Node.js-правила (через `eslint-plugin-n`) и Node-глобалы в `languageOptions.globals`.

## Key Rules

- `n/no-exports-assign`: запрещает перезапись `exports`.
- `n/no-new-require`: запрещает `new require(...)`.

## Examples

```ts
// ✅ Good
module.exports = { run };
const mod = require('./mod');

// ❌ Bad
exports = { run };
const bad = new require('./mod');
```
