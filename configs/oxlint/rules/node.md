# node preset

## Purpose

Node.js-правила и окружение `env.node = true`.

## Key Rules

- `node/no-exports-assign`: запрещает перезапись `exports`.
- `node/no-new-require`: запрещает `new require(...)`.

## Examples

```ts
// ✅ Good
module.exports = { run };
const mod = require('./mod');

// ❌ Bad
exports = { run };
const bad = new require('./mod');
```
