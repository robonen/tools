<script setup lang="ts">
import { ref } from 'vue';
import { watchDebounced } from './index';

// Classic debounced search box: keystrokes mutate `query` instantly, but the
// "fetch" callback only fires once typing settles — with a maxWait ceiling so
// a long burst still flushes at least every 1500ms.
const query = ref('vue composables');
const debounce = ref(400);

const settledQuery = ref(query.value);
const keystrokes = ref(0);
const fetches = ref(0);

watchDebounced(
  query,
  (value) => {
    settledQuery.value = value;
    fetches.value++;
  },
  { debounce, maxWait: 1500 },
);

function onInput() {
  keystrokes.value++;
}

const savings = () =>
  keystrokes.value === 0 ? 0 : Math.round((1 - fetches.value / keystrokes.value) * 100);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="wd-search">
        Search
      </label>
      <input
        id="wd-search"
        v-model="query"
        type="text"
        placeholder="Start typing…"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        @input="onInput"
      >
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Debounce</span>
        <span class="font-mono text-xs text-(--fg-muted) tabular-nums">{{ debounce }}ms</span>
      </div>
      <input
        v-model.number="debounce"
        type="range"
        min="0"
        max="1200"
        step="50"
        class="w-full accent-(--accent) cursor-pointer"
      >
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex flex-col gap-1">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Settled query</span>
      <span class="font-mono text-sm text-(--fg) truncate">{{ settledQuery || '—' }}</span>
    </div>

    <div class="grid grid-cols-3 gap-2 text-center">
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-3">
        <div class="font-mono text-2xl font-bold tabular-nums text-(--fg)">{{ keystrokes }}</div>
        <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">keystrokes</div>
      </div>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-3">
        <div class="font-mono text-2xl font-bold tabular-nums text-(--accent-text)">{{ fetches }}</div>
        <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">fetches</div>
      </div>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-3">
        <div class="font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {{ savings() }}%
        </div>
        <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">saved</div>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Callback fires <span class="font-mono text-(--fg-muted)">{{ debounce }}ms</span> after you stop typing,
      capped by a <span class="font-mono text-(--fg-muted)">maxWait: 1500</span> ceiling.
    </p>
  </div>
</template>
