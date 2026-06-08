<script setup lang="ts">
const installCode = `pnpm add @robonen/stdlib`;

const usageCode = `import { groupBy, unique, clamp, tryIt } from '@robonen/stdlib';

// Arrays — group records by a derived key
const byType = groupBy(
  [{ type: 'a', v: 1 }, { type: 'b', v: 2 }, { type: 'a', v: 3 }],
  item => item.type,
);
// => { a: [{ type: 'a', v: 1 }, { type: 'a', v: 3 }], b: [{ type: 'b', v: 2 }] }

// Arrays — dedupe in a single pass
unique([1, 1, 2, 3, 3]); // => [1, 2, 3]

// Math — keep a value inside a range
clamp(value, 0, 100);

// Async — error handling without forking control flow
const { error, data } = await tryIt(fetch)('/api/todos/1');
if (error) {
  // handle the failure
} else {
  // use data
}`;
</script>

<template>
  <div class="docs-section">
    <!-- Hero -->
    <div class="prose-docs">
      <h1>@robonen/stdlib</h1>
      <p class="text-lg text-(--fg-muted)">
        A platform-independent standard library of tools, utilities, and helpers for TypeScript —
        arrays, async, math, data structures, and patterns, all tree-shakeable and fully typed.
      </p>
    </div>

    <div class="prose-docs">
      <p>
        Every project ends up reimplementing the same handful of helpers: dedupe an array,
        clamp a number, group records by a key, retry a flaky request. <code>@robonen/stdlib</code>
        collects those building blocks into one cohesive, dependency-free package. It runs the same
        in Node, the browser, and the edge — there are no platform globals, no polyfills, and no
        runtime dependencies. Import only what you use; the rest is shaken out of your bundle.
      </p>
    </div>

    <!-- Feature highlights -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="text-sm font-semibold text-(--fg) mb-1.5">Fully typed</h3>
        <p class="text-sm text-(--fg-muted) leading-relaxed">
          Generic signatures preserve element and key types end to end, so inference keeps
          working through <code>groupBy</code>, <code>partition</code>, <code>zip</code>, and friends.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="text-sm font-semibold text-(--fg) mb-1.5">Zero dependencies</h3>
        <p class="text-sm text-(--fg-muted) leading-relaxed">
          No transitive dependencies and no platform assumptions. The same code runs in Node,
          the browser, Deno, Bun, and edge runtimes.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="text-sm font-semibold text-(--fg) mb-1.5">Tree-shakeable</h3>
        <p class="text-sm text-(--fg-muted) leading-relaxed">
          Each utility is a standalone export with no shared side effects. Import a single
          function and ship only that function.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="text-sm font-semibold text-(--fg) mb-1.5">Batteries included</h3>
        <p class="text-sm text-(--fg-muted) leading-relaxed">
          Beyond array and math helpers you get data structures
          (<code>Deque</code>, <code>BinaryHeap</code>, <code>LinkedList</code>) and patterns
          (<code>StateMachine</code>, <code>PubSub</code>, <code>Command</code>).
        </p>
      </div>
    </div>

    <!-- Install -->
    <div class="prose-docs">
      <h2>Install</h2>
    </div>
    <DocsCode :code="installCode" lang="bash" />

    <!-- Usage -->
    <div class="prose-docs">
      <h2>Quick start</h2>
      <p>
        Import named utilities directly from the package root. Each one is small, predictable,
        and focused on a single job.
      </p>
    </div>
    <DocsCode :code="usageCode" lang="ts" />

    <!-- Modules overview -->
    <div class="prose-docs">
      <h2>What's inside</h2>
      <p>
        The library is organized into focused modules. A few of the most-used building blocks:
      </p>
      <ul>
        <li>
          <strong>Arrays</strong> — <code>groupBy</code>, <code>partition</code>,
          <code>unique</code>, <code>zip</code>, <code>cluster</code>, <code>range</code>.
        </li>
        <li>
          <strong>Async</strong> — <code>tryIt</code>, <code>retry</code>, <code>pool</code>,
          <code>sleep</code> for control flow that doesn't fight you.
        </li>
        <li>
          <strong>Math</strong> — <code>clamp</code>, <code>lerp</code>, <code>remap</code>,
          each with a BigInt variant.
        </li>
        <li>
          <strong>Functions</strong> — <code>debounce</code>, <code>throttle</code>,
          <code>memoize</code>, <code>once</code>, <code>compose</code>, <code>pipe</code>.
        </li>
        <li>
          <strong>Structs &amp; patterns</strong> — <code>Deque</code>,
          <code>PriorityQueue</code>, <code>StateMachine</code>, <code>PubSub</code> and more.
        </li>
      </ul>
    </div>

    <!-- Where to next -->
    <div class="rounded-lg border border-(--border) bg-(--bg-elevated) p-5">
      <h2 class="text-base font-semibold text-(--fg) mb-2">Where to next</h2>
      <p class="text-sm text-(--fg-muted) mb-3">
        Browse the full API reference below, or jump straight to a popular utility:
      </p>
      <ul class="flex flex-wrap gap-2 m-0 p-0 list-none">
        <li>
          <NuxtLink
            to="/stdlib/group-by"
            class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-subtle) px-3 py-1.5 text-sm text-(--accent-text) hover:bg-(--bg-inset) focus:ring-(--ring)"
          >
            groupBy
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/stdlib/try-it"
            class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-subtle) px-3 py-1.5 text-sm text-(--accent-text) hover:bg-(--bg-inset) focus:ring-(--ring)"
          >
            tryIt
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/stdlib/retry"
            class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-subtle) px-3 py-1.5 text-sm text-(--accent-text) hover:bg-(--bg-inset) focus:ring-(--ring)"
          >
            retry
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/stdlib/clamp"
            class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-subtle) px-3 py-1.5 text-sm text-(--accent-text) hover:bg-(--bg-inset) focus:ring-(--ring)"
          >
            clamp
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/stdlib/debounce"
            class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-subtle) px-3 py-1.5 text-sm text-(--accent-text) hover:bg-(--bg-inset) focus:ring-(--ring)"
          >
            debounce
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
