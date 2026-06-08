<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { refThrottled } from './index';

const delay = ref(500);

// A high-frequency source the throttled ref will rate-limit.
const source = ref(0);
const throttled = refThrottled(source, delay.value);

// Track how often each side actually updates so the savings are visible.
const sourceUpdates = ref(0);
const throttledUpdates = ref(0);

let lastThrottled = throttled.value;
const lag = computed(() => source.value - throttled.value);

let timer: ReturnType<typeof setInterval> | undefined;
const running = ref(false);

function tick() {
  source.value++;
  sourceUpdates.value++;
  if (throttled.value !== lastThrottled) {
    lastThrottled = throttled.value;
    throttledUpdates.value++;
  }
}

function start() {
  if (running.value)
    return;
  running.value = true;
  timer = setInterval(tick, 60);
}

function stop() {
  running.value = false;
  if (timer)
    clearInterval(timer);
  timer = undefined;
}

function reset() {
  stop();
  source.value = 0;
  sourceUpdates.value = 0;
  throttledUpdates.value = 0;
  lastThrottled = throttled.value;
}

onUnmounted(stop);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Source</span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ source }}</span>
        <span class="text-xs text-(--fg-muted)">{{ sourceUpdates }} updates</span>
      </div>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Throttled</span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--accent-text)">{{ throttled }}</span>
        <span class="text-xs text-(--fg-muted)">{{ throttledUpdates }} updates</span>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Lag behind source</span>
      <span class="font-mono text-sm tabular-nums text-(--fg)">+{{ lag }}</span>
    </div>

    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Throttle window: {{ delay }}ms
      </span>
      <input
        v-model.number="delay"
        type="range"
        min="100"
        max="1500"
        step="100"
        class="w-full accent-(--accent) cursor-pointer"
      >
      <span class="text-xs text-(--fg-subtle)">Reset to apply a new window</span>
    </label>

    <div class="flex gap-2">
      <button
        type="button"
        :disabled="running"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="start"
      >
        Run (60ms)
      </button>
      <button
        type="button"
        :disabled="!running"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="stop"
      >
        Pause
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="reset"
      >
        Reset
      </button>
    </div>
  </div>
</template>
