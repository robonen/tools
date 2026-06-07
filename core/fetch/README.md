# @robonen/fetch

A lightweight, type-safe `fetch` wrapper with interceptors, retry, timeout, and a composable plugin system — V8-optimized internals, zero runtime dependencies beyond the standard library.

```ts
import { $fetch } from '@robonen/fetch';

const user = await $fetch<User>('https://api.example.com/users/1');
//    ^? User — body is parsed and typed for you
```

## Install

```bash
pnpm install @robonen/fetch
```

## Why

`globalThis.fetch` is great primitive plumbing, but every app re-implements the same layer on top of it: JSON parsing, throwing on `4xx`/`5xx`, base URLs, query strings, retries, timeouts, auth headers. `@robonen/fetch` is that layer — small, typed, and built so attaching features costs nothing on the hot path.

- **🎯 Type-safe** — response data, options, and plugin-contributed fields are all inferred.
- **📦 Smart bodies** — plain objects are JSON-serialized; `FormData`/`Blob`/streams pass through untouched.
- **🧠 Auto-parsing** — response decoded from `Content-Type`, or forced via `responseType`.
- **💥 Errors that throw** — non-2xx responses reject with a rich `FetchError`.
- **🔁 Retry & ⏱️ timeout** — built in, per-request configurable, sensible defaults.
- **🪝 Lifecycle hooks** — `onRequest` / `onResponse` / `onRequestError` / `onResponseError`.
- **🧩 Plugins** — composed once, typed, with onion-style `execute` middleware.
- **🌱 `create` / `extend`** — derive pre-configured instances that inherit defaults and plugins.

---

## Quick start

```ts
import { $fetch } from '@robonen/fetch';

// GET + automatic JSON parse
const todo = await $fetch<Todo>('https://api.example.com/todos/1');

// POST a plain object — serialized to JSON, content-type set for you
const created = await $fetch<Todo>('https://api.example.com/todos', {
  method: 'POST',
  body: { title: 'Ship it', done: false },
});

// Method shortcuts
await $fetch.get('https://api.example.com/todos');
await $fetch.delete('https://api.example.com/todos/1');
```

---

## Features

### Type-safe responses

The first type parameter types the parsed body; the second drives the parsing mode.

```ts
interface User { id: number; name: string }

const user = await $fetch<User>('/users/1');        // Promise<User>
const ids  = await $fetch<number[]>('/users/ids');  // Promise<number[]>
```

### Method shortcuts

```ts
await $fetch.get<User>('/users/1');
await $fetch.post<User>('/users', { body: { name: 'Alice' } });
await $fetch.put('/users/1', { body: patch });
await $fetch.patch('/users/1', { body: partial });
await $fetch.delete('/users/1');
await $fetch.head('/users/1'); // returns the raw Response
```

### Base URL & query params

```ts
const api = $fetch.create({ baseURL: 'https://api.example.com/v1' });

await api('/users');                              // → https://api.example.com/v1/users
await api('/search', { query: { q: 'vue', page: 2 } });
//                                                → ...?q=vue&page=2
```

`null` / `undefined` query values are dropped, existing query strings are preserved, and the query is inserted **before** any `#fragment`.

### Automatic body serialization

```ts
// Plain object → JSON  (content-type: application/json + accept: application/json)
await $fetch.post('/users', { body: { name: 'Alice' } });

// content-type: application/x-www-form-urlencoded → form-encoded automatically
await $fetch.post('/login', {
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: { user: 'a', pass: 'b' },               // → "user=a&pass=b"
});

// FormData / Blob / ReadableStream / raw string → passed through untouched
await $fetch.post('/upload', { body: formData });
await $fetch.post('/ndjson', { body: '{"a":1}\n{"b":2}' }); // you own content-type
```

### Response type detection

The body is decoded from the response `Content-Type`, or you can force it:

```ts
const text = await $fetch<string, 'text'>('/readme', { responseType: 'text' });
const blob = await $fetch<Blob, 'blob'>('/avatar.png', { responseType: 'blob' });
const buf  = await $fetch<ArrayBuffer, 'arrayBuffer'>('/file', { responseType: 'arrayBuffer' });
const sse  = await $fetch<ReadableStream, 'stream'>('/events', { responseType: 'stream' });

// Custom parser (e.g. superjson, devalue)
const data = await $fetch('/data', { parseResponse: txt => superjson.parse(txt) });
```

### Errors that throw

Any `4xx`/`5xx` rejects with a `FetchError` carrying the request, parsed body, and status.

```ts
import { FetchError } from '@robonen/fetch';

try {
  await $fetch('/users/999');
}
catch (err) {
  if (err instanceof FetchError) {
    err.status;       // 404
    err.statusText;   // "Not Found"
    err.data;         // parsed error body
    err.request;      // the URL/Request
    err.options;      // resolved request options (hooks stripped)
  }
}

// Opt out — get the parsed body even on error responses
const body = await $fetch('/maybe-404', { ignoreResponseError: true });
```

### Retry

Retries are built in. Defaults: **1 retry for non-payload methods** (GET/HEAD…), **0 for payload methods** (POST/PUT/PATCH/DELETE), on status `408, 409, 425, 429, 500, 502, 503, 504`.

```ts
await $fetch('/flaky', { retry: 3 });                      // up to 3 retries
await $fetch('/flaky', { retry: 3, retryDelay: 200 });     // 200ms between attempts
await $fetch('/flaky', { retry: 3, retryDelay: ctx => ctx.response?.status === 429 ? 1000 : 200 });
await $fetch('/flaky', { retryStatusCodes: [429, 503] });  // custom allowlist
await $fetch('/flaky', { retry: false });                  // disable
```

A **user-initiated abort never retries**; a timeout does.

### Timeout

Backed by `AbortSignal.timeout`, composed with any signal you pass. The timeout applies **per attempt**, so a slow attempt that times out still gets retried with a fresh signal.

```ts
await $fetch('/slow', { timeout: 5000 });

// Combine with your own AbortController — both are honoured
const controller = new AbortController();
await $fetch('/slow', { timeout: 5000, signal: controller.signal });
```

### Lifecycle hooks

```ts
await $fetch('/users', {
  onRequest: (ctx) => {
    ctx.options.headers.set('authorization', `Bearer ${token}`);
  },
  onResponse: (ctx) => {
    console.log(ctx.response.status, ctx.response._data);
  },
  onResponseError: (ctx) => {
    report(ctx.response.status, ctx.request);
  },
  onRequestError: (ctx) => {
    console.error('network failure', ctx.error);
  },
});
```

Hooks accept a single function or an array, and run after any plugin hooks for the same phase.

---

## Instances: `create` / `extend`

Derive a configured instance. Defaults and plugins are merged; child wins on conflicts.

```ts
const api = $fetch.create({
  baseURL: 'https://api.example.com',
  headers: { 'x-app': 'web' },
  retry: 2,
});

// `extend` is an alias for `create` — layer on more defaults / plugins
const billing = api.extend({ baseURL: 'https://billing.example.com' });

await api('/users');        // x-app + retry:2 inherited
await billing('/invoices'); // inherits headers/retry, overrides baseURL
```

Need the raw `Response`, or the underlying native fetch?

```ts
const res = await $fetch.raw<User>('/users/1');
res._data;   // parsed body
res.headers; // full Response API

await $fetch.native('https://example.com'); // untouched globalThis.fetch
```

---

## Plugins

A plugin is a reusable bundle of **defaults**, **typed options**, **lifecycle hooks**, and optional **`execute` middleware**. Plugins are composed once at `createFetch` time — attaching them adds zero per-request overhead beyond the hooks themselves.

```ts
import { createFetch, definePlugin } from '@robonen/fetch';
```

### Auth header injection — with a typed per-request option

```ts
const auth = definePlugin<'auth', { token?: string }>({
  name: 'auth',
  hooks: {
    onRequest: (ctx) => {
      const token = (ctx.options as { token?: string }).token;
      if (token) ctx.options.headers.set('authorization', `Bearer ${token}`);
    },
  },
});

const api = createFetch({ plugins: [auth] });

await api('/me', { token: 'xyz' }); // `token` is type-checked thanks to the plugin
```

### Token auto-refresh on 401

```ts
function createAuthPlugin(getAccessToken: () => Promise<string>) {
  let current: Promise<string> | undefined;
  const refresh = () => (current ??= getAccessToken().finally(() => { current = undefined; }));

  return definePlugin<'auth', { skipAuth?: boolean }>({
    name: 'auth',
    defaults: { retry: 1, retryStatusCodes: [401, 408, 429, 500, 502, 503, 504] },
    hooks: {
      onRequest: async (ctx) => {
        if ((ctx.options as { skipAuth?: boolean }).skipAuth) return;
        ctx.options.headers.set('authorization', `Bearer ${await refresh()}`);
      },
      onResponseError: async (ctx) => {
        if (ctx.response.status !== 401) return;
        current = undefined; // invalidate; the retry picks up a fresh token
        ctx.options.headers.set('authorization', `Bearer ${await refresh()}`);
      },
    },
  });
}
```

### Response envelope unwrapping — `{ data, meta }` → `data`

```ts
const unwrap = definePlugin({
  name: 'unwrap',
  hooks: {
    onResponse: (ctx) => {
      const body = ctx.response._data as { data?: unknown } | undefined;
      if (body && typeof body === 'object' && 'data' in body) {
        ctx.response._data = body.data;
      }
    },
  },
});
```

### `execute` middleware — onion-style wrapping

`execute` wraps the whole fetch attempt (the built-in `retry` is itself an `execute` middleware). Middlewares may call `next()` zero, one, or many times.

```ts
const logger = definePlugin({
  name: 'logger',
  execute: async (ctx, next) => {
    const start = performance.now();
    try {
      await next(); // run the attempt (+ inner middlewares)
      console.log(`${ctx.request} → ${ctx.response?.status} in ${(performance.now() - start) | 0}ms`);
    }
    catch (err) {
      console.error(`${ctx.request} failed in ${(performance.now() - start) | 0}ms`);
      throw err;
    }
  },
});
```

### Composing — order matters

Hooks run in registration order; the user's per-request hook runs last.

```ts
const api = createFetch({
  baseURL: 'https://api.example.com',
  plugins: [createAuthPlugin(fetchToken), logger, unwrap],
});

// Children inherit every parent plugin and may add their own
const idempotency = definePlugin<'idempotency', { idempotencyKey?: string }>({
  name: 'idempotency',
  hooks: {
    onRequest: (ctx) => {
      const m = (ctx.options.method ?? 'GET').toUpperCase();
      if (m === 'GET' || m === 'HEAD') return;
      const key = (ctx.options as { idempotencyKey?: string }).idempotencyKey ?? crypto.randomUUID();
      ctx.options.headers.set('idempotency-key', key);
    },
  },
});

const billing = api.extend({ baseURL: 'https://billing.example.com' }, { plugins: [idempotency] });
await billing('/invoices', { method: 'POST', body: { amount: 100 } });
```

---

## API reference

### `$fetch(request, options?)` / `createFetch(globalOptions?)`

| Option              | Type                                  | Description |
| ------------------- | ------------------------------------- | ----------- |
| `baseURL`           | `string`                              | Prepended to relative request URLs. |
| `query`             | `Record<string, …>`                   | Serialized and appended to the URL. |
| `body`              | `RequestInit['body'] \| object \| array` | Objects are JSON-serialized. |
| `responseType`      | `'json' \| 'text' \| 'blob' \| 'arrayBuffer' \| 'stream'` | Forces the parse mode. |
| `parseResponse`     | `(text: string) => T`                 | Custom body parser. |
| `ignoreResponseError` | `boolean`                           | Don't throw on `4xx`/`5xx`. |
| `retry`             | `number \| false`                     | Retry attempts on failure. |
| `retryDelay`        | `number \| (ctx) => number`           | Delay between retries. |
| `retryStatusCodes`  | `readonly number[]`                   | Status codes that trigger a retry. |
| `timeout`           | `number`                              | Per-attempt timeout in ms. |
| `onRequest` / `onResponse` / `onRequestError` / `onResponseError` | hook(s) | Lifecycle callbacks. |

…plus every native `RequestInit` field (`headers`, `method`, `signal`, `credentials`, …).

### Instance members

| Member            | Description |
| ----------------- | ----------- |
| `$fetch(req, o?)` | Returns the parsed body. |
| `$fetch.raw(req, o?)` | Returns the full `Response` with a parsed `_data`. |
| `$fetch.get/post/put/patch/delete/head` | Method shortcuts. |
| `$fetch.create(defaults?, globalOptions?)` | New instance with merged config. |
| `$fetch.extend(...)` | Alias for `create`. |
| `$fetch.native` | The underlying `globalThis.fetch`. |

---

## License

Apache-2.0 © Robonen Andrew
