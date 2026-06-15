<script setup lang="ts">
import { ref } from 'vue';
import { useRefHistory } from './index';

const text = ref('The quick brown fox');

const {
  history,
  canUndo,
  canRedo,
  isTracking,
  undo,
  redo,
  clear,
  pause,
  resume,
} = useRefHistory(text, { capacity: 10 });

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
  });
}
</script>

<template>
  <div class="demo-stack max-w-md">
    <!-- Source editor -->
    <div class="flex flex-col gap-2">
      <label class="demo-label">
        Tracked value
      </label>
      <input
        v-model="text"
        type="text"
        placeholder="Type to record history…"
        class="demo-input"
      >
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!canUndo"
        @click="undo"
      >
        ↶ Undo
      </button>
      <button
        type="button"
        class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!canRedo"
        @click="redo"
      >
        ↷ Redo
      </button>

      <button
        type="button"
        class="demo-btn"
        @click="isTracking ? pause() : resume()"
      >
        {{ isTracking ? '❚❚ Pause' : '▶ Resume' }}
      </button>

      <button
        type="button"
        class="demo-btn ml-auto"
        @click="clear"
      >
        Clear
      </button>
    </div>

    <!-- Tracking status -->
    <div class="flex items-center gap-2">
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="isTracking
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="isTracking ? 'bg-emerald-500' : 'bg-amber-500'" />
        {{ isTracking ? 'Tracking' : 'Paused' }}
      </span>
      <span class="text-xs text-fg-subtle tabular-nums">
        {{ history.length }} record{{ history.length === 1 ? '' : 's' }}
      </span>
    </div>

    <!-- History timeline -->
    <div class="demo-card p-2">
      <ul class="flex max-h-48 flex-col gap-1 overflow-y-auto">
        <li
          v-for="(record, i) in history"
          :key="record.timestamp + '-' + i"
          class="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm"
          :class="i === 0 ? 'bg-accent-subtle' : ''"
        >
          <span class="font-mono text-xs text-fg-subtle tabular-nums">
            {{ formatTime(record.timestamp) }}
          </span>
          <span class="flex-1 truncate" :class="i === 0 ? 'font-medium text-accent-text' : 'text-fg-muted'">
            {{ record.snapshot || '(empty)' }}
          </span>
          <span
            v-if="i === 0"
            class="text-xs font-medium text-accent-text"
          >current</span>
        </li>
      </ul>
    </div>
  </div>
</template>
