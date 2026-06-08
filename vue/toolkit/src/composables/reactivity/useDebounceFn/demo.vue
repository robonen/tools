<script setup lang="ts">
import { ref } from 'vue';
import { useDebounceFn } from './index';

const delay = ref(500);
const query = ref('');
const calls = ref(0);
const lastResult = ref('');
const log = ref<string[]>([]);

const runSearch = useDebounceFn((term: string) => {
  calls.value++;
  const result = term.trim() ? `${term.length} matches for "${term.trim()}"` : 'idle';
  lastResult.value = result;
  log.value = [`#${calls.value} → ${result}`, ...log.value].slice(0, 5);
  return result;
}, delay, { maxWait: 2000 });

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value;
  runSearch(query.value);
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">useDebounceFn</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
        :class="runSearch.isPending.value
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span
          class="size-1.5 rounded-full transition"
          :class="runSearch.isPending.value ? 'animate-pulse bg-sky-500' : 'bg-(--fg-subtle)'"
        />
        {{ runSearch.isPending.value ? 'Pending' : 'Settled' }}
      </span>
    </div>

    <div class="flex flex-col gap-2">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="search">
        Type to search
      </label>
      <input
        id="search"
        :value="query"
        type="text"
        placeholder="Search the docs…"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        @input="onInput"
      >
    </div>

    <div class="flex items-center gap-3">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="delay">
        Delay
      </label>
      <input
        id="delay"
        v-model.number="delay"
        type="range"
        min="0"
        max="1500"
        step="100"
        class="flex-1 accent-(--accent)"
      >
      <span class="w-16 text-right font-mono text-sm tabular-nums text-(--fg)">{{ delay }}ms</span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Invocations</p>
        <p class="mt-1 font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ calls }}</p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Last result</p>
        <p class="mt-1 truncate font-mono text-sm text-(--fg)">{{ lastResult || '—' }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:border-(--border-strong) hover:bg-(--bg-inset) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!runSearch.isPending.value"
        @click="runSearch.flush()"
      >
        Flush now
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:border-(--border-strong) hover:bg-(--bg-inset) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!runSearch.isPending.value"
        @click="runSearch.cancel()"
      >
        Cancel
      </button>
    </div>

    <div v-if="log.length" class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
      <p class="mb-2 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Recent calls</p>
      <ul class="space-y-1 font-mono text-xs text-(--fg-muted)">
        <li v-for="(entry, i) in log" :key="i" class="truncate">{{ entry }}</li>
      </ul>
    </div>
  </div>
</template>
