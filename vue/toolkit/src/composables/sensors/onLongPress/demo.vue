<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { onLongPress } from './index';

// onLongPress(target, handler, options) — target is a MaybeComputedElementRef.
const pressTarget = useTemplateRef<HTMLButtonElement>('pressTarget');

const DELAY = 700;
const longPresses = ref(0);
const taps = ref(0);
const lastDuration = ref(0);
const triggered = ref(false);

// Fires once the press passes `delay` (held without moving past the threshold).
onLongPress(
  pressTarget,
  () => {
    longPresses.value++;
    triggered.value = true;
  },
  {
    delay: DELAY,
    modifiers: { prevent: true },
    // Reports every release: duration, travel distance, and long-press status.
    onMouseUp: (duration, _distance, isLongPress) => {
      lastDuration.value = Math.round(duration);
      if (!isLongPress)
        taps.value++;
      triggered.value = false;
    },
  },
);

const progress = computed(() => Math.min(100, Math.round((lastDuration.value / DELAY) * 100)));
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <button
      ref="pressTarget"
      type="button"
      class="select-none rounded-xl border px-4 py-8 text-center font-medium transition-colors duration-200 cursor-pointer active:scale-[0.99]"
      :class="triggered
        ? 'border-transparent bg-(--accent) text-(--accent-fg)'
        : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:border-(--border-strong)'"
    >
      <span class="block text-base font-semibold">
        {{ triggered ? 'Long press detected' : 'Press & hold me' }}
      </span>
      <span class="mt-1 block text-xs" :class="triggered ? 'text-(--accent-fg)/80' : 'text-(--fg-subtle)'">
        hold for {{ DELAY }}ms — a quick click counts as a tap
      </span>
    </button>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col items-center gap-1">
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ longPresses }}</span>
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">long presses</span>
      </div>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col items-center gap-1">
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ taps }}</span>
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">taps</span>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Last hold</span>
        <span class="font-mono text-sm tabular-nums text-(--fg)">{{ lastDuration }}ms</span>
      </div>
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-(--bg-elevated)">
        <div
          class="h-full rounded-full bg-(--accent) transition-[width] duration-200"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle) leading-relaxed">
      Moving more than ~10px while holding cancels the press. The
      <span class="font-mono text-(--accent-text)">onMouseUp</span> callback tells taps from holds.
    </p>
  </div>
</template>
