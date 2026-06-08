<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { usePerformanceObserver } from './index';

interface Entry {
  name: string;
  type: string;
  startTime: number;
  duration: number;
}

const entries = shallowRef<Entry[]>([]);
const total = ref(0);

const { isSupported, isActive, pause, resume } = usePerformanceObserver(
  (list) => {
    const next = list.getEntries().map(e => ({
      name: e.name,
      type: e.entryType,
      startTime: e.startTime,
      duration: e.duration,
    }));
    total.value += next.length;
    // Keep the most recent entries, newest first.
    entries.value = [...next.reverse(), ...entries.value].slice(0, 8);
  },
  {
    entryTypes: ['measure', 'mark'],
    buffered: true,
  },
);

let counter = 0;

// Emit real User Timing entries the observer will pick up.
function measureWork(): void {
  const id = ++counter;
  const startMark = `task-${id}-start`;
  const endMark = `task-${id}-end`;

  performance.mark(startMark);
  // A small synchronous workload so the measure has a non-zero duration.
  let acc = 0;
  for (let i = 0; i < 2_000_000; i++)
    acc += Math.sqrt(i);
  performance.mark(endMark);
  performance.measure(`render-pass-${id} (${acc > 0 ? 'ok' : 'noop'})`, startMark, endMark);
}

function toggle(): void {
  isActive.value ? pause() : resume();
}

const lastDuration = computed(() => {
  const measure = entries.value.find(e => e.type === 'measure');
  return measure ? measure.duration : 0;
});
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div v-if="!isSupported" class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
      <code class="font-mono">PerformanceObserver</code> is not supported in this browser.
    </div>

    <template v-else>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Performance entries</span>
          <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
            <span class="size-1.5 rounded-full transition" :class="isActive ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
            {{ isActive ? 'Observing' : 'Paused' }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
            <div class="font-mono text-lg font-bold tabular-nums text-(--fg)">{{ total }}</div>
            <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">entries seen</div>
          </div>
          <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
            <div class="font-mono text-lg font-bold tabular-nums text-(--fg)">{{ lastDuration.toFixed(2) }}</div>
            <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">last measure ms</div>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <ul v-if="entries.length" class="flex flex-col gap-1.5">
            <li
              v-for="(entry, i) in entries"
              :key="`${entry.name}-${i}`"
              class="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-1.5"
            >
              <span class="flex min-w-0 items-center gap-2">
                <span
                  class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-elevated) px-1.5 py-0.5 text-[10px] font-medium uppercase text-(--fg-muted)"
                >{{ entry.type }}</span>
                <span class="truncate font-mono text-xs text-(--fg)">{{ entry.name }}</span>
              </span>
              <span class="shrink-0 font-mono text-xs tabular-nums text-(--fg-muted)">{{ entry.duration.toFixed(1) }}ms</span>
            </li>
          </ul>
          <div
            v-else
            class="rounded-lg border border-dashed border-(--border) bg-(--bg-inset) p-6 text-center text-sm text-(--fg-subtle)"
          >
            No entries yet — run a measured task
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
          @click="measureWork"
        >
          Run measured task
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="toggle"
        >
          {{ isActive ? 'Pause' : 'Resume' }}
        </button>
      </div>

      <p class="text-xs text-(--fg-subtle)">
        Each task emits User Timing <code class="font-mono">mark</code>/<code class="font-mono">measure</code> entries that the observer streams in live.
      </p>
    </template>
  </div>
</template>
