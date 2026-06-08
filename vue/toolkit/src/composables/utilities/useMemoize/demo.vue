<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMemoize } from './index';

interface Result {
  value: number;
  computedAt: string;
}

// Track how many times the resolver actually runs, so cache hits are visible.
const runs = ref(0);

// An "expensive" computation. With useMemoize, a repeated input returns the
// cached Result instantly and the resolver does NOT run again.
const fib = useMemoize((n: number): Result => {
  runs.value++;
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++)
    [a, b] = [b, a + b];

  return {
    value: a,
    computedAt: new Date().toLocaleTimeString(),
  };
}, { getKey: n => n });

const input = ref(20);

interface LogEntry {
  id: number;
  n: number;
  value: number;
  hit: boolean;
  computedAt: string;
}

const history = ref<LogEntry[]>([]);
let nextId = 0;

// Reactive cache size — reads the shallowReactive cache, so it stays live.
const cacheSize = computed(() => (fib.cache as Map<number, Result>).size);

function compute(force = false): void {
  const before = runs.value;
  const result = force ? fib.load(input.value) : fib(input.value);
  const hit = !force && runs.value === before;

  history.value.unshift({
    id: nextId++,
    n: input.value,
    value: result.value,
    hit,
    computedAt: result.computedAt,
  });
}

function evictCurrent(): void {
  fib.delete(input.value);
}

function clearAll(): void {
  fib.clear();
  history.value = [];
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">resolver runs</p>
        <p class="mt-1 font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ runs }}</p>
      </div>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">cached keys</p>
        <p class="mt-1 font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ cacheSize }}</p>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">fib(n)</span>
        <span class="font-mono text-sm tabular-nums text-(--fg-muted)">key: {{ fib.generateKey(input) }}</span>
      </div>
      <div class="flex items-center gap-3">
        <input
          v-model.number="input"
          type="range"
          min="0"
          max="40"
          class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-(--bg-inset) accent-(--accent)"
        >
        <span class="w-8 text-right font-mono text-sm tabular-nums text-(--fg)">{{ input }}</span>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="compute()"
      >
        Compute
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="compute(true)"
      >
        load (force)
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="evictCurrent"
      >
        delete(n)
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="cacheSize === 0 && history.length === 0"
        @click="clearAll"
      >
        clear
      </button>
    </div>

    <div class="flex max-h-44 flex-col gap-2 overflow-y-auto rounded-xl border border-(--border) bg-(--bg-elevated) p-3">
      <p v-if="history.length === 0" class="py-5 text-center text-sm italic text-(--fg-subtle)">
        Compute a value — repeat the same n to see a cache hit.
      </p>
      <div
        v-for="entry in history"
        :key="entry.id"
        class="flex items-center gap-2 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2 font-mono text-sm tabular-nums text-(--fg)"
      >
        <span class="text-(--fg-subtle)">fib({{ entry.n }})</span>
        <span class="text-(--fg-subtle)">=</span>
        <span class="min-w-0 flex-1 truncate text-(--accent-text)">{{ entry.value }}</span>
        <span class="text-xs text-(--fg-subtle)">{{ entry.computedAt }}</span>
        <span
          class="shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase"
          :class="entry.hit
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'"
        >
          {{ entry.hit ? 'hit' : 'miss' }}
        </span>
      </div>
    </div>
  </div>
</template>
