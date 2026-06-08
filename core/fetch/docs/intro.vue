<script setup lang="ts">
// Landing hero for @robonen/fetch — static, SSR-safe content.
const quickStart = `import { $fetch } from '@robonen/fetch';

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

// GET + automatic JSON parse — the body is typed for you
const todo = await $fetch<Todo>('https://api.example.com/todos/1');

// POST a plain object — serialized to JSON, content-type set automatically
const created = await $fetch<Todo>('https://api.example.com/todos', {
  method: 'POST',
  body: { title: 'Ship it', done: false },
});

// Method shortcuts
await $fetch.get<Todo>('https://api.example.com/todos/1');
await $fetch.delete('https://api.example.com/todos/1');`;

const instances = `import { $fetch } from '@robonen/fetch';

// Derive a pre-configured instance — defaults & plugins are inherited
const api = $fetch.create({
  baseURL: 'https://api.example.com/v1',
  headers: { 'x-app': 'web' },
  retry: 2,
});

await api('/users');                       // → /v1/users, retry:2, x-app header
await api('/search', { query: { q: 'vue', page: 2 } });

// 'extend' layers on more defaults / plugins; child wins on conflicts
const billing = api.extend({ baseURL: 'https://billing.example.com' });`;
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>@robonen/fetch</h1>
      <p>
        A lightweight, type-safe <code>fetch</code> wrapper with interceptors, retry,
        timeout, and a composable plugin system — V8-optimized internals, zero runtime
        dependencies beyond the standard library.
      </p>
    </div>

    <div class="prose-docs">
      <p>
        <code>globalThis.fetch</code> is great primitive plumbing, but every app
        re-implements the same layer on top of it: JSON parsing, throwing on
        <code>4xx</code>/<code>5xx</code>, base URLs, query strings, retries, timeouts,
        auth headers. <strong>@robonen/fetch</strong> is that layer — small, fully typed,
        and built so attaching features costs nothing on the hot path.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">Type-safe end to end</h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          Response data, request options, and plugin-contributed fields are all inferred —
          the parsed body comes back typed, no casting required.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">Smart bodies &amp; parsing</h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          Plain objects are JSON-serialized; <code>FormData</code>/<code>Blob</code>/streams
          pass through untouched. Responses are decoded from <code>Content-Type</code> or
          forced via <code>responseType</code>.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">Retry, timeout &amp; errors</h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          Built-in retry and per-attempt timeout with sensible defaults, and non-2xx
          responses reject with a rich <code>FetchError</code> carrying status, request,
          and parsed body.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">Hooks &amp; plugins</h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          Lifecycle hooks plus a typed, composable plugin system with onion-style
          <code>execute</code> middleware — composed once, with zero per-request overhead
          beyond the hooks themselves.
        </p>
      </div>
    </div>

    <div class="prose-docs">
      <h2>Install</h2>
    </div>

    <DocsCode :code="`pnpm add @robonen/fetch`" lang="bash" />

    <div class="prose-docs">
      <h2>Quick start</h2>
      <p>
        Import the default <code>$fetch</code> instance — it is backed by
        <code>globalThis.fetch</code> and ready to use. The first type parameter types the
        parsed body.
      </p>
    </div>

    <DocsCode :code="quickStart" lang="ts" />

    <div class="prose-docs">
      <h2>Configured instances</h2>
      <p>
        Use <code>create</code> (or its alias <code>extend</code>) to derive instances with
        a <code>baseURL</code>, default headers, retry policy, and plugins. Configuration is
        merged down the chain; the child wins on conflicts.
      </p>
    </div>

    <DocsCode :code="instances" lang="ts" />

    <div class="prose-docs">
      <h2>Where to next</h2>
      <p>
        The full API reference is listed below. A few good places to start:
      </p>
      <ul>
        <li>
          <NuxtLink to="/fetch/create-fetch"><code>createFetch</code></NuxtLink> — build a
          fully configured instance with defaults and plugins.
        </li>
        <li>
          <NuxtLink to="/fetch/define-plugin"><code>definePlugin</code></NuxtLink> — bundle
          defaults, typed options, hooks, and <code>execute</code> middleware into a
          reusable plugin.
        </li>
        <li>
          <NuxtLink to="/fetch/fetch-error"><code>FetchError</code></NuxtLink> — the rich
          error thrown on non-2xx responses.
        </li>
        <li>
          <NuxtLink to="/fetch/build-url"><code>buildURL</code></NuxtLink> and
          <NuxtLink to="/fetch/detect-response-type"><code>detectResponseType</code></NuxtLink>
          — the URL and response-type helpers used internally, exported for reuse.
        </li>
      </ul>
    </div>
  </div>
</template>
