<script setup lang="ts">
import { computed } from 'vue';
import { useSupported } from './index';

// Probe a handful of real browser APIs. Each feature is a guarded getter so
// useSupported can run during SSR without ever touching `window` on the server.
const features = [
  { name: 'IntersectionObserver', test: () => 'IntersectionObserver' in window },
  { name: 'ResizeObserver', test: () => 'ResizeObserver' in window },
  { name: 'Clipboard API', test: () => 'clipboard' in navigator },
  { name: 'Web Share', test: () => 'share' in navigator },
  { name: 'Geolocation', test: () => 'geolocation' in navigator },
  { name: 'EyeDropper', test: () => 'EyeDropper' in window },
];

const checks = features.map(f => ({ name: f.name, supported: useSupported(f.test) }));

const supportedCount = computed(() => checks.filter(c => c.supported.value).length);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Browser features</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          {{ supportedCount }} / {{ checks.length }} available
        </span>
      </div>

      <ul class="flex flex-col gap-1.5">
        <li
          v-for="check in checks"
          :key="check.name"
          class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2 text-sm"
        >
          <span class="font-mono text-(--fg)">{{ check.name }}</span>
          <span
            v-if="check.supported.value"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          >
            <span class="size-1.5 rounded-full bg-emerald-500" />
            Supported
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1.5 text-xs font-medium text-(--fg-subtle)"
          >
            <span class="size-1.5 rounded-full bg-(--border-strong)" />
            Unavailable
          </span>
        </li>
      </ul>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Each check is SSR-safe: the result is <span class="font-mono text-(--fg-muted)">false</span> during
      server render and resolves on the client after mount.
    </p>
  </div>
</template>
