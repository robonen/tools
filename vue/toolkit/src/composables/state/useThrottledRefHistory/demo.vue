<script setup lang="ts">
import { ref } from 'vue';
import { useThrottledRefHistory } from './index';

// A continuously-mutating value (a slider) — rapid changes are collapsed
// into at most one committed snapshot per throttle interval.
const value = ref(50);
const throttle = ref(600);

const {
  history,
  canUndo,
  canRedo,
  undo,
  redo,
  clear,
} = useThrottledRefHistory(value, { throttle });

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
  });
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <!-- Live value -->
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-baseline justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Live value
        </span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ value }}</span>
      </div>

      <input
        v-model.number="value"
        type="range"
        min="0"
        max="100"
        class="mt-3 w-full cursor-pointer accent-(--accent)"
      >
      <p class="mt-2 text-xs text-(--fg-subtle)">
        Drag the slider — only one snapshot is committed per {{ throttle }}ms.
      </p>
    </div>

    <!-- Throttle interval -->
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Throttle
      </span>
      <div class="flex gap-1.5">
        <button
          v-for="ms in [200, 600, 1500]"
          :key="ms"
          type="button"
          class="inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-medium tabular-nums transition active:scale-[0.98] cursor-pointer"
          :class="throttle === ms
            ? 'border-transparent bg-(--accent) text-(--accent-fg)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          @click="throttle = ms"
        >
          {{ ms }}ms
        </button>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!canUndo"
        @click="undo"
      >
        ↶ Undo
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!canRedo"
        @click="redo"
      >
        ↷ Redo
      </button>
      <button
        type="button"
        class="ml-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="clear"
      >
        Clear
      </button>
    </div>

    <!-- Committed snapshots -->
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-2">
      <ul class="flex max-h-40 flex-col gap-1 overflow-y-auto">
        <li
          v-for="(record, i) in history"
          :key="record.timestamp + '-' + i"
          class="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm"
          :class="i === 0 ? 'bg-(--accent-subtle)' : ''"
        >
          <span class="font-mono text-xs text-(--fg-subtle) tabular-nums">
            {{ formatTime(record.timestamp) }}
          </span>
          <span
            class="flex-1 font-mono tabular-nums"
            :class="i === 0 ? 'font-medium text-(--accent-text)' : 'text-(--fg-muted)'"
          >
            {{ record.snapshot }}
          </span>
          <span v-if="i === 0" class="text-xs font-medium text-(--accent-text)">latest</span>
        </li>
      </ul>
    </div>
  </div>
</template>
