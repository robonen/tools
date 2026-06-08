<script setup lang="ts">
import { ref } from 'vue';
import { useDebouncedRefHistory } from './index';

// A draft message the user types into. Rapid keystrokes collapse into a single
// history record once typing pauses for `debounce` ms.
const message = ref('The quick brown fox');

const debounce = ref(400);

const { history, undo, redo, canUndo, canRedo, clear } = useDebouncedRefHistory(message, {
  debounce,
  maxWait: 2000,
  capacity: 8,
});

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
  });
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Tracked draft</span>
      <textarea
        v-model="message"
        rows="2"
        placeholder="Type fast — bursts collapse into one record"
        class="w-full resize-none rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      />
    </label>

    <label class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Debounce delay</span>
        <span class="font-mono text-xs tabular-nums text-(--fg-muted)">{{ debounce }}ms</span>
      </div>
      <input
        v-model.number="debounce"
        type="range"
        min="0"
        max="1200"
        step="100"
        class="w-full accent-(--accent)"
      >
    </label>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        :disabled="!canUndo"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="undo"
      >
        Undo
      </button>
      <button
        type="button"
        :disabled="!canRedo"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="redo"
      >
        Redo
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="clear"
      >
        Clear
      </button>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">History</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted) tabular-nums">
          {{ history.length }} records
        </span>
      </div>
      <ol class="flex flex-col gap-1.5">
        <li
          v-for="(record, i) in history"
          :key="record.timestamp"
          class="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-1.5"
        >
          <span class="truncate font-mono text-sm text-(--fg)">"{{ record.snapshot }}"</span>
          <span class="shrink-0 font-mono text-xs tabular-nums" :class="i === 0 ? 'text-(--accent-text)' : 'text-(--fg-subtle)'">
            {{ i === 0 ? 'now' : formatTime(record.timestamp) }}
          </span>
        </li>
      </ol>
    </div>
  </div>
</template>
