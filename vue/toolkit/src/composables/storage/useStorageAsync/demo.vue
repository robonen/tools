<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useStorageAsync } from './index';
import type { StorageLikeAsync } from './index';

// useStorageAsync works with any async backend (IndexedDB, a REST cache, etc.).
// We simulate latency with a tiny in-memory store so the demo is SSR-safe and
// you can watch the `isReady` flag flip once the initial read resolves.
const store = reactive<Record<string, string>>({});
const LATENCY = 600;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => { setTimeout(() => resolve(value), LATENCY); });
}

const asyncStorage: StorageLikeAsync = {
  getItem: (key) => delay(key in store ? store[key] : null),
  setItem: async (key, value) => { await delay(null); store[key] = value; },
  removeItem: async (key) => { await delay(null); delete store[key]; },
};

const saving = ref(false);

// Returns { state, isReady } and is itself awaitable. `isReady` flips to true
// once the initial async read resolves — the composable sets it for us.
const { state: prefs, isReady } = useStorageAsync(
  'demo:async-prefs',
  { theme: 'system', density: 'comfortable' },
  asyncStorage,
);

const themes = ['light', 'dark', 'system'] as const;
const densities = ['compact', 'comfortable'] as const;

async function update<K extends keyof typeof prefs.value>(key: K, value: (typeof prefs.value)[K]) {
  prefs.value = { ...prefs.value, [key]: value };
  // The watcher writes asynchronously; show a brief saving indicator.
  saving.value = true;
  await delay(null);
  saving.value = false;
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Async preferences</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
        :class="isReady
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="isReady ? 'bg-emerald-500' : 'bg-(--fg-subtle) animate-pulse'"
        />
        {{ isReady ? 'ready' : 'loading…' }}
      </span>
    </div>

    <div
      v-if="!isReady"
      class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3"
    >
      <div class="h-3 w-1/3 animate-pulse rounded bg-(--bg-inset)" />
      <div class="h-9 w-full animate-pulse rounded-lg bg-(--bg-inset)" />
      <div class="h-3 w-1/3 animate-pulse rounded bg-(--bg-inset)" />
      <div class="h-9 w-full animate-pulse rounded-lg bg-(--bg-inset)" />
    </div>

    <div v-else class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Theme</span>
        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="t in themes"
            :key="t"
            type="button"
            class="rounded-lg border px-2 py-1.5 text-sm font-medium capitalize transition active:scale-[0.98] cursor-pointer"
            :class="prefs.theme === t
              ? 'border-transparent bg-(--accent) text-(--accent-fg)'
              : 'border-(--border) bg-(--bg-inset) text-(--fg) hover:border-(--border-strong)'"
            @click="update('theme', t)"
          >
            {{ t }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Density</span>
        <div class="grid grid-cols-2 gap-1.5">
          <button
            v-for="d in densities"
            :key="d"
            type="button"
            class="rounded-lg border px-2 py-1.5 text-sm font-medium capitalize transition active:scale-[0.98] cursor-pointer"
            :class="prefs.density === d
              ? 'border-transparent bg-(--accent) text-(--accent-fg)'
              : 'border-(--border) bg-(--bg-inset) text-(--fg) hover:border-(--border-strong)'"
            @click="update('density', d)"
          >
            {{ d }}
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) flex items-center justify-between">
      <span class="truncate">{{ JSON.stringify(prefs) }}</span>
      <span
        class="ml-2 shrink-0 text-xs transition"
        :class="saving ? 'text-sky-600 dark:text-sky-400' : 'text-(--fg-subtle)'"
      >
        {{ saving ? 'saving…' : 'saved' }}
      </span>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Every change is written through the async backend with simulated latency.
    </p>
  </div>
</template>
