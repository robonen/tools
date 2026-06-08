<script setup lang="ts">
import { ref } from 'vue';
import { until } from './index';

// A small game: nudge the value toward a target, and `until` resolves a promise
// the moment the source matches — no manual watcher teardown required.
const TARGET = 7;

const count = ref(0);
const status = ref<'idle' | 'waiting' | 'reached' | 'timeout'>('idle');
const log = ref<string[]>([]);

function push(message: string) {
  log.value = [message, ...log.value].slice(0, 4);
}

async function awaitTarget() {
  status.value = 'waiting';
  push(`Waiting for count === ${TARGET} (3s timeout)…`);

  try {
    const value = await until(count).toBe(TARGET, { timeout: 3000, throwOnTimeout: true });
    status.value = 'reached';
    push(`Resolved! count reached ${value}.`);
  }
  catch {
    status.value = 'timeout';
    push('Timed out before reaching the target.');
  }
}

async function awaitChanges() {
  status.value = 'waiting';
  push('Waiting for 3 changes via changedTimes(3)…');
  const value = await until(count).changedTimes(3);
  status.value = 'reached';
  push(`Source changed 3 times, now ${value}.`);
}

function reset() {
  count.value = 0;
  status.value = 'idle';
  log.value = [];
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Live source</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          target = {{ TARGET }}
        </span>
      </div>

      <div class="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Decrement"
          class="inline-flex items-center justify-center rounded-lg border border-(--border) bg-(--bg-elevated) size-11 text-lg font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="count--"
        >
          −
        </button>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ count }}</span>
        <button
          type="button"
          aria-label="Increment"
          class="inline-flex items-center justify-center rounded-lg border border-transparent bg-(--accent) size-11 text-lg font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
          @click="count++"
        >
          +
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          :disabled="status === 'waiting'"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="awaitTarget"
        >
          await toBe({{ TARGET }})
        </button>
        <button
          type="button"
          :disabled="status === 'waiting'"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="awaitChanges"
        >
          changedTimes(3)
        </button>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Promise log</span>
        <span
          class="text-xs font-medium"
          :class="{
            'text-(--fg-subtle)': status === 'idle',
            'text-amber-600 dark:text-amber-400': status === 'waiting',
            'text-emerald-600 dark:text-emerald-400': status === 'reached',
            'text-red-600 dark:text-red-400': status === 'timeout',
          }"
        >{{ status }}</span>
      </div>
      <p v-if="!log.length" class="font-mono text-xs text-(--fg-subtle)">
        Press a button, then change the value above.
      </p>
      <p
        v-for="(line, i) in log"
        v-else
        :key="i"
        class="font-mono text-xs text-(--fg)"
        :class="{ 'opacity-50': i > 0 }"
      >
        {{ line }}
      </p>
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
      @click="reset"
    >
      Reset
    </button>
  </div>
</template>
