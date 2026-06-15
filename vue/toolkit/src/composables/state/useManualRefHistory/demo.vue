<script setup lang="ts">
import { ref } from 'vue';
import { useManualRefHistory } from './index';

// A pannable, hue-shiftable color value. Snapshots are only recorded when the
// user explicitly commits — perfect for a "save state" / checkpoint workflow.
const hue = ref(210);

const { history, undo, redo, commit, reset, clear, canUndo, canRedo } = useManualRefHistory(hue, {
  capacity: 6,
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
    <div class="demo-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="demo-label">Working value</span>
        <span class="font-mono text-sm tabular-nums text-fg-muted">hue {{ hue }}°</span>
      </div>

      <div
        class="h-16 w-full rounded-lg border border-border"
        :style="{ backgroundColor: `hsl(${hue} 72% 56%)` }"
      />

      <input
        v-model.number="hue"
        type="range"
        min="0"
        max="360"
        class="w-full accent-accent"
      >

      <button
        type="button"
        class="demo-btn-primary"
        @click="commit"
      >
        Commit snapshot
      </button>
    </div>

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
        @click="reset"
      >
        Reset
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
        <span class="demo-label">Committed snapshots</span>
        <span class="demo-badge tabular-nums">
          {{ history.length }}
        </span>
      </div>
      <ol class="flex flex-col gap-1.5">
        <li
          v-for="(record, i) in history"
          :key="record.timestamp"
          class="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-inset px-3 py-1.5"
        >
          <span class="flex items-center gap-2">
            <span
              class="h-4 w-4 shrink-0 rounded-full border border-border"
              :style="{ backgroundColor: `hsl(${record.snapshot} 72% 56%)` }"
            />
            <span class="font-mono text-sm tabular-nums text-fg">{{ record.snapshot }}°</span>
          </span>
          <span class="shrink-0 font-mono text-xs tabular-nums" :class="i === 0 ? 'text-accent-text' : 'text-fg-subtle'">
            {{ i === 0 ? 'current' : formatTime(record.timestamp) }}
          </span>
        </li>
      </ol>
    </div>

    <p class="text-xs text-fg-subtle">
      Unlike automatic history, nothing is recorded until you press
      <span class="font-mono">Commit snapshot</span>.
    </p>
  </div>
</template>
