<script setup lang="ts">
import { computed, ref } from 'vue';
import { useInterval } from './index';

const interval = ref(1000);

const { counter, isActive, pause, resume, reset } = useInterval(interval, {
  controls: true,
  immediate: true,
});

// A simple visual pulse driven purely off the reactive tick counter.
const beats = computed(() => Array.from({ length: 8 }, (_, i) => i === counter.value % 8));

const speeds = [
  { value: 2000, label: 'Slow' },
  { value: 1000, label: 'Normal' },
  { value: 400, label: 'Fast' },
] as const;

function toggle() {
  if (isActive.value)
    pause();
  else
    resume();
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5 text-center">
      <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Ticks elapsed
      </div>
      <div class="mt-2 font-mono text-5xl font-bold tabular-nums text-(--fg)">
        {{ counter }}
      </div>

      <div class="mt-4 flex items-center justify-center gap-1.5">
        <span
          v-for="(on, i) in beats"
          :key="i"
          class="size-2.5 rounded-full transition-colors duration-200"
          :class="on ? 'bg-(--accent)' : 'bg-(--bg-inset)'"
        />
      </div>

      <div class="mt-4 flex items-center justify-center gap-2 text-xs text-(--fg-subtle)">
        <span
          class="inline-block size-2 rounded-full transition"
          :class="isActive ? 'bg-emerald-500' : 'bg-(--border-strong)'"
        />
        {{ isActive ? `Ticking every ${interval}ms` : 'Paused' }}
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Interval speed
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
    </div>

    <div class="flex items-center gap-2">
      <button
        class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="toggle"
      >
        {{ isActive ? 'Pause' : 'Resume' }}
      </button>
      <button
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="counter === 0"
        @click="reset"
      >
        Reset
      </button>
    </div>
  </div>
</template>
