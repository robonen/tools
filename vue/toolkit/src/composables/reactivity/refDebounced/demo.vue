<script setup lang="ts">
import { computed, ref } from 'vue';
import { refDebounced } from './index';

const search = ref('Vue composables');
const ms = ref(400);

// Read-only mirror that only updates after `ms` of quiet, with a maxWait ceiling.
const debounced = refDebounced(search, ms, { maxWait: 2000 });

const pending = computed(() => search.value !== debounced.value);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Type to search
      </span>
      <input
        v-model="search"
        placeholder="Start typing…"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
    </label>

    <label class="flex flex-col gap-1.5 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="flex items-center justify-between text-sm text-(--fg)">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">debounce</span>
        <span class="font-mono tabular-nums text-(--fg-muted)">{{ ms }}ms</span>
      </span>
      <input
        v-model.number="ms"
        type="range"
        min="100"
        max="1500"
        step="50"
        class="w-full accent-(--accent) cursor-pointer"
      >
    </label>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-3">
        <p class="mb-1 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Source
        </p>
        <p class="truncate font-mono text-sm text-(--fg)">{{ search || '—' }}</p>
      </div>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-3">
        <p class="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Debounced
          <span
            v-if="pending"
            class="size-1.5 animate-pulse rounded-full bg-amber-500"
            aria-label="pending"
          />
        </p>
        <p class="truncate font-mono text-sm text-(--accent-text)">{{ debounced || '—' }}</p>
      </div>
    </div>

    <p
      class="rounded-lg border px-3 py-2 text-center text-xs font-medium transition"
      :class="pending
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
    >
      {{ pending ? 'Waiting for input to settle…' : 'Synced — debounced value caught up' }}
    </p>
  </div>
</template>
