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
  <div class="demo-stack max-w-sm">
    <label class="flex flex-col gap-1.5">
      <span class="demo-label">
        Type to search
      </span>
      <input
        v-model="search"
        placeholder="Start typing…"
        class="demo-input"
      >
    </label>

    <label class="demo-card flex flex-col gap-1.5 p-4">
      <span class="flex items-center justify-between text-sm text-fg">
        <span class="demo-label">debounce</span>
        <span class="font-mono tabular-nums text-fg-muted">{{ ms }}ms</span>
      </span>
      <input
        v-model.number="ms"
        type="range"
        min="100"
        max="1500"
        step="50"
        class="w-full accent-accent cursor-pointer"
      >
    </label>

    <div class="grid grid-cols-2 gap-3">
      <div class="demo-card p-3">
        <p class="demo-label mb-1">
          Source
        </p>
        <p class="truncate font-mono text-sm text-fg">{{ search || '—' }}</p>
      </div>
      <div class="demo-card p-3">
        <p class="demo-label mb-1 flex items-center gap-1.5">
          Debounced
          <span
            v-if="pending"
            class="size-1.5 animate-pulse rounded-full bg-amber-500"
            aria-label="pending"
          />
        </p>
        <p class="truncate font-mono text-sm text-accent-text">{{ debounced || '—' }}</p>
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
