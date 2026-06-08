<script setup lang="ts">
import { useOnline } from './index';

// Returns a single readonly ref — bind it directly, do not destructure.
const online = useOnline();
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      class="flex flex-col items-center gap-3 rounded-xl border p-8 transition-colors duration-300"
      :class="online
        ? 'border-emerald-500/30 bg-emerald-500/10'
        : 'border-red-500/30 bg-red-500/10'"
    >
      <span
        class="flex size-16 items-center justify-center rounded-full transition-colors duration-300"
        :class="online ? 'bg-emerald-500/20' : 'bg-red-500/20'"
      >
        <span
          class="size-4 rounded-full transition-colors duration-300"
          :class="online ? 'animate-pulse bg-emerald-500' : 'bg-red-500'"
        />
      </span>
      <div class="text-center">
        <p
          class="text-lg font-bold transition-colors duration-300"
          :class="online ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'"
        >
          {{ online ? 'You are online' : 'You are offline' }}
        </p>
        <p class="mt-0.5 text-xs text-(--fg-muted)">
          Reflects <code class="font-mono">navigator.onLine</code>
        </p>
      </div>
    </div>

    <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2.5">
      <span class="text-sm text-(--fg-muted)"><code class="font-mono">online.value</code></span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
        :class="online
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-red-500/10 text-red-600 dark:text-red-400'"
      >
        <span class="size-1.5 rounded-full" :class="online ? 'bg-emerald-500' : 'bg-red-500'" />
        {{ online ? 'true' : 'false' }}
      </span>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Disable Wi-Fi or flip DevTools to <span class="font-medium text-(--fg-muted)">Offline</span> and the banner updates instantly.
    </p>
  </div>
</template>
