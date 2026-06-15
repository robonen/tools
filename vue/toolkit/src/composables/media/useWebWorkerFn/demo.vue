<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { useWebWorkerFn } from './index';

const iterations = ref(50_000_000);
const result = shallowRef<number | undefined>();
const elapsed = shallowRef<number | undefined>();

// A deliberately heavy, self-contained computation: sum of primes' count.
// Runs in a transient worker so the UI stays responsive while it churns.
const { workerFn, workerStatus, workerTerminate, isSupported } = useWebWorkerFn(
  (count: number) => {
    let sum = 0;
    for (let i = 0; i < count; i++)
      sum += Math.sqrt(i) % 1;
    return Math.round(sum);
  },
  { timeout: 15_000 },
);

const isRunning = computed(() => workerStatus.value === 'RUNNING');

async function run(): Promise<void> {
  result.value = undefined;
  elapsed.value = undefined;
  const startedAt = performance.now();
  try {
    result.value = await workerFn(iterations.value);
    elapsed.value = Math.round(performance.now() - startedAt);
  }
  catch {
    // Status reflects ERROR / TIMEOUT_EXPIRED; nothing else to do here.
  }
}

const statusStyles: Record<string, string> = {
  PENDING: 'text-fg-muted',
  RUNNING: 'text-sky-600 dark:text-sky-400',
  SUCCESS: 'text-emerald-600 dark:text-emerald-400',
  ERROR: 'text-red-600 dark:text-red-400',
  TIMEOUT_EXPIRED: 'text-amber-600 dark:text-amber-400',
};
</script>

<template>
  <div class="demo-stack max-w-md">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400"
    >
      Web Workers are not supported in this browser.
    </div>

    <template v-else>
      <div class="demo-card p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="demo-label">Iterations</span>
          <span class="font-mono text-sm tabular-nums text-fg">{{ iterations.toLocaleString() }}</span>
        </div>
        <input
          v-model.number="iterations"
          type="range"
          min="10000000"
          max="200000000"
          step="10000000"
          :disabled="isRunning"
          class="w-full accent-accent cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="demo-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="isRunning"
          @click="run"
        >
          <span v-if="isRunning" class="size-2 rounded-full bg-accent-fg animate-pulse" />
          {{ isRunning ? 'Computing…' : 'Run in worker' }}
        </button>
        <button
          type="button"
          class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!isRunning"
          @click="workerTerminate()"
        >
          Cancel
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-lg border border-border bg-bg-inset p-3 flex flex-col gap-1">
          <span class="demo-label">Result</span>
          <span class="demo-stat text-xl">
            {{ result?.toLocaleString() ?? '—' }}
          </span>
        </div>
        <div class="rounded-lg border border-border bg-bg-inset p-3 flex flex-col gap-1">
          <span class="demo-label">Elapsed</span>
          <span class="demo-stat text-xl">
            {{ elapsed !== undefined ? `${elapsed}ms` : '—' }}
          </span>
        </div>
      </div>

      <div class="rounded-lg border border-border bg-bg-inset p-3 flex items-center justify-between">
        <span class="demo-label">Status</span>
        <span class="font-mono text-sm" :class="statusStyles[workerStatus]">{{ workerStatus }}</span>
      </div>

      <p class="text-xs text-fg-subtle">
        The heavy loop runs off the main thread, so this UI stays interactive while it computes.
      </p>
    </template>
  </div>
</template>
