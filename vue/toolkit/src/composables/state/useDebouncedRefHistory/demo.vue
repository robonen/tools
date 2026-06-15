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
  <div class="demo-stack max-w-sm">
    <label class="flex flex-col gap-1.5">
      <span class="demo-label">Tracked draft</span>
      <textarea
        v-model="message"
        rows="2"
        placeholder="Type fast — bursts collapse into one record"
        class="demo-input resize-none"
      />
    </label>

    <label class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <span class="demo-label">Debounce delay</span>
        <span class="font-mono text-xs tabular-nums text-fg-muted">{{ debounce }}ms</span>
      </div>
      <input
        v-model.number="debounce"
        type="range"
        min="0"
        max="1200"
        step="100"
        class="w-full accent-accent"
      >
    </label>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        :disabled="!canUndo"
        class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="undo"
      >
        Undo
      </button>
      <button
        type="button"
        :disabled="!canRedo"
        class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="redo"
      >
        Redo
      </button>
      <button
        type="button"
        class="demo-btn"
        @click="clear"
      >
        Clear
      </button>
    </div>

    <div class="demo-card p-4 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="demo-label">History</span>
        <span class="demo-badge tabular-nums">
          {{ history.length }} records
        </span>
      </div>
      <ol class="flex flex-col gap-1.5">
        <li
          v-for="(record, i) in history"
          :key="record.timestamp"
          class="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-inset px-3 py-1.5"
        >
          <span class="truncate font-mono text-sm text-fg">"{{ record.snapshot }}"</span>
          <span class="shrink-0 font-mono text-xs tabular-nums" :class="i === 0 ? 'text-accent-text' : 'text-fg-subtle'">
            {{ i === 0 ? 'now' : formatTime(record.timestamp) }}
          </span>
        </li>
      </ol>
    </div>
  </div>
</template>
