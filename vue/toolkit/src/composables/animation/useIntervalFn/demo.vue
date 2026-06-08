<script setup lang="ts">
import { ref } from 'vue';
import { useIntervalFn } from './index';

const interval = ref(800);
const logs = ref<{ id: number; time: string }[]>([]);
let nextId = 0;

const { isActive, pause, resume, toggle } = useIntervalFn(
  () => {
    logs.value.unshift({
      id: nextId++,
      time: new Date().toLocaleTimeString(undefined, { hour12: false }),
    });
    if (logs.value.length > 6)
      logs.value.length = 6;
  },
  interval,
  { immediate: false },
);

const speeds = [
  { value: 1500, label: 'Slow' },
  { value: 800, label: 'Normal' },
  { value: 300, label: 'Fast' },
] as const;

function clear() {
  logs.value = [];
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div>
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Interval callback
        </div>
        <div class="mt-1 flex items-center gap-2 text-sm text-(--fg-muted)">
          <span
            class="inline-block size-2 rounded-full transition"
            :class="isActive ? 'bg-emerald-500' : 'bg-(--border-strong)'"
          />
          {{ isActive ? `Firing every ${interval}ms` : 'Stopped' }}
        </div>
      </div>
      <button
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="toggle"
      >
        {{ isActive ? 'Pause' : 'Start' }}
      </button>
    </div>

    <div class="flex flex-col gap-1.5">
      <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Interval
      </div>
      <div class="flex gap-2">
        <button
          v-for="speed in speeds"
          :key="speed.value"
          class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="interval === speed.value
            ? 'border-transparent bg-(--accent) text-(--accent-fg)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          @click="interval = speed.value"
        >
          {{ speed.label }}
        </button>
      </div>
      <p class="text-xs text-(--fg-subtle)">
        Changing the interval while running restarts the timer with the new duration.
      </p>
    </div>

    <div class="flex items-center justify-between">
      <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Tick log
      </div>
      <button
        class="text-xs text-(--accent-text) transition hover:underline disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        :disabled="logs.length === 0"
        @click="clear"
      >
        Clear
      </button>
    </div>

    <div class="min-h-32 rounded-lg border border-(--border) bg-(--bg-inset) p-3">
      <p v-if="logs.length === 0" class="py-6 text-center text-sm text-(--fg-subtle)">
        No ticks yet — press Start.
      </p>
      <ul v-else class="flex flex-col gap-1.5">
        <li
          v-for="log in logs"
          :key="log.id"
          class="flex items-center gap-2 font-mono text-sm tabular-nums text-(--fg)"
        >
          <span class="inline-block size-1.5 rounded-full bg-(--accent)" />
          {{ log.time }}
        </li>
      </ul>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="isActive"
        @click="resume"
      >
        Resume
      </button>
      <button
        class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!isActive"
        @click="pause"
      >
        Pause
      </button>
    </div>
  </div>
</template>
