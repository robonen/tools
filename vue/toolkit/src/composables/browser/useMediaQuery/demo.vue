<script setup lang="ts">
import { useMediaQuery } from './index';

// useMediaQuery returns a single ComputedRef<boolean> — bind it directly.
const isWide = useMediaQuery('(min-width: 1024px)');
const isMedium = useMediaQuery('(min-width: 640px)');
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
const isPortrait = useMediaQuery('(orientation: portrait)');
const isFinePointer = useMediaQuery('(pointer: fine)');

const breakpoint = isWide;

const queries = [
  { label: 'min-width: 1024px', match: isWide },
  { label: 'min-width: 640px', match: isMedium },
  { label: 'prefers-color-scheme: dark', match: prefersDark },
  { label: 'prefers-reduced-motion', match: prefersReducedMotion },
  { label: 'orientation: portrait', match: isPortrait },
  { label: 'pointer: fine', match: isFinePointer },
];
</script>

<template>
  <div class="demo-stack max-w-md">
    <div class="demo-card p-4 text-center">
      <p class="demo-label">
        Current layout
      </p>
      <p class="demo-stat mt-1 text-3xl">
        {{ breakpoint ? 'desktop' : isMedium ? 'tablet' : 'mobile' }}
      </p>
      <p class="mt-1 text-sm text-fg-muted">
        Resize the window to watch these queries flip live.
      </p>
    </div>

    <ul class="demo-card divide-y divide-border">
      <li
        v-for="query in queries"
        :key="query.label"
        class="flex items-center justify-between gap-3 px-3 py-2.5"
      >
        <code class="font-mono text-sm text-fg">{{ query.label }}</code>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
          :class="query.match.value
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-border bg-bg-inset text-fg-subtle'"
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="query.match.value ? 'bg-emerald-500' : 'bg-border-strong'"
          />
          {{ query.match.value ? 'matches' : 'no match' }}
        </span>
      </li>
    </ul>
  </div>
</template>
