<script setup lang="ts">
import { useMounted } from './index';

// A readonly ref that flips to true once the component is mounted.
const isMounted = useMounted();
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-col gap-1">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">useMounted</span>
      <p class="text-sm text-(--fg-muted)">
        Tracks whether the component has finished mounting — handy for SSR-safe rendering and entry animations.
      </p>
    </div>

    <div class="flex items-center justify-between rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex flex-col gap-0.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">isMounted</span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ isMounted }}</span>
      </div>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition"
        :class="isMounted
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'"
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="isMounted ? 'bg-emerald-500' : 'bg-amber-500'"
        />
        {{ isMounted ? 'mounted' : 'mounting…' }}
      </span>
    </div>

    <!-- Mount-gated reveal: only animates in once the client takes over. -->
    <div
      class="overflow-hidden rounded-lg border border-(--border) bg-(--bg-inset) p-4 transition-all duration-500 ease-out"
      :class="isMounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'"
    >
      <p class="text-sm text-(--fg)">
        This panel fades and slides into view the moment <code class="font-mono">isMounted</code> becomes
        <code class="font-mono text-(--fg)">true</code>.
      </p>
      <p class="mt-1 text-xs text-(--fg-subtle)">
        On the server it renders hidden, avoiding hydration flicker.
      </p>
    </div>
  </div>
</template>
