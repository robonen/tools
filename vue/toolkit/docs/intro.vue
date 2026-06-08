<script setup lang="ts">
import { useCounter } from '../src';

const { count, increment, decrement, reset } = useCounter(0, { min: 0, max: 10 });
</script>

<template>
  <div class="docs-section">
    <!-- Hero -->
    <div class="prose-docs">
      <h1>@robonen/vue</h1>
      <p>
        A collection of <strong>213+ tree-shakeable, SSR-safe composables</strong> for Vue 3 —
        reactive primitives for state, sensors, the DOM, browser APIs, animation, forms and more.
      </p>
    </div>

    <div class="prose-docs">
      <p>
        Every Vue app ends up re-implementing the same building blocks: a toggle, a debounced ref,
        an event listener that cleans itself up, a media query, local-storage state. @robonen/vue
        ships those building blocks as small, composable functions with a consistent API. Each one
        is independently tree-shakeable, written in TypeScript with full inference, and safe to call
        during server-side rendering — guards for <code>window</code>, <code>document</code> and
        <code>navigator</code> are built in, so the same code runs on the server and hydrates cleanly
        on the client.
      </p>
    </div>

    <!-- Feature highlights -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="text-sm font-semibold text-(--fg) mb-1.5">Tree-shakeable by design</h3>
        <p class="text-sm text-(--fg-muted) leading-relaxed">
          Import only what you use. Each composable lives on its own and pulls in nothing it
          doesn't need — your bundle stays exactly as small as your usage.
        </p>
      </div>

      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="text-sm font-semibold text-(--fg) mb-1.5">SSR-safe out of the box</h3>
        <p class="text-sm text-(--fg-muted) leading-relaxed">
          Browser-only access is guarded behind lifecycle hooks and configurable
          <code>window</code>/<code>document</code> targets, so Nuxt and SSR setups just work.
        </p>
      </div>

      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="text-sm font-semibold text-(--fg) mb-1.5">Fully typed</h3>
        <p class="text-sm text-(--fg-muted) leading-relaxed">
          Written in TypeScript with precise return types and generics. <code>MaybeRefOrGetter</code>
          arguments mean you can pass plain values, refs or getters interchangeably.
        </p>
      </div>

      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="text-sm font-semibold text-(--fg) mb-1.5">Broad coverage</h3>
        <p class="text-sm text-(--fg-muted) leading-relaxed">
          From state and reactivity to sensors, elements, storage, math and form handling —
          one cohesive toolkit spanning the whole surface of a Vue app.
        </p>
      </div>
    </div>

    <!-- Install -->
    <div class="prose-docs">
      <h2>Install</h2>
    </div>
    <DocsCode :code="`pnpm add @robonen/vue`" lang="bash" />

    <!-- Usage -->
    <div class="prose-docs">
      <h2>Quick start</h2>
      <p>
        Import the composables you need and use them inside <code>&lt;script setup&gt;</code>.
        Here's a counter clamped to a range, with auto-cleaning keyboard shortcuts:
      </p>
    </div>
    <DocsCode
      :code="`import { useCounter, useEventListener, useToggle } from '@robonen/vue';

// Clamped, reactive counter
const { count, increment, decrement, reset } = useCounter(0, { min: 0, max: 10 });

// A boolean toggle with custom truthy/falsy values
const { value: theme, toggle } = useToggle('light', {
  truthyValue: 'dark',
  falsyValue: 'light',
});

// Listener is removed automatically on unmount
useEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') increment();
  if (e.key === 'ArrowDown') decrement();
});`"
      lang="ts"
    />

    <!-- Live demo -->
    <div class="prose-docs">
      <p>The same <code>useCounter</code> running live:</p>
    </div>
    <ClientOnly>
      <div class="flex items-center gap-3 rounded-lg border border-(--border) bg-(--bg-subtle) p-4">
        <button
          type="button"
          class="size-9 rounded-md border border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) focus:outline-none focus:ring-2 focus:ring-(--ring) disabled:opacity-40"
          :disabled="count <= 0"
          @click="decrement()"
        >
          −
        </button>
        <span class="min-w-12 text-center text-lg font-medium tabular-nums text-(--fg)">{{ count }}</span>
        <button
          type="button"
          class="size-9 rounded-md border border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) focus:outline-none focus:ring-2 focus:ring-(--ring) disabled:opacity-40"
          :disabled="count >= 10"
          @click="increment()"
        >
          +
        </button>
        <button
          type="button"
          class="ml-auto rounded-md px-3 py-1.5 text-sm text-(--fg-muted) hover:text-(--fg) hover:bg-(--bg-inset) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          @click="reset()"
        >
          Reset
        </button>
      </div>
    </ClientOnly>

    <!-- Where to next -->
    <div class="prose-docs">
      <h2>Where to next</h2>
      <p>
        The full API reference is listed right below. A few good starting points:
      </p>
      <ul>
        <li>
          <NuxtLink to="/vue/use-counter">useCounter</NuxtLink> — a clamped, reactive counter
          with increment / decrement / set / reset.
        </li>
        <li>
          <NuxtLink to="/vue/use-toggle">useToggle</NuxtLink> — a boolean toggle with
          customizable truthy / falsy values.
        </li>
        <li>
          <NuxtLink to="/vue/use-event-listener">useEventListener</NuxtLink> — declarative
          event listeners that clean up on unmount.
        </li>
        <li>
          <NuxtLink to="/vue/use-storage">useStorage</NuxtLink> — reactive state synced to
          <code>localStorage</code> / <code>sessionStorage</code>.
        </li>
        <li>
          <NuxtLink to="/vue/use-magic-keys">useMagicKeys</NuxtLink> — reactive keyboard
          state for building shortcuts.
        </li>
      </ul>
    </div>
  </div>
</template>
