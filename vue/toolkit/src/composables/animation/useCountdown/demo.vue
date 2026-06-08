<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCountdown } from './index';

const initial = ref(60);
const justFinished = ref(false);

const { remaining, isActive, start, stop, pause, resume } = useCountdown(initial, {
  onComplete: () => {
    justFinished.value = true;
  },
  onTick: () => {
    justFinished.value = false;
  },
});

const minutes = computed(() => String(Math.floor(remaining.value / 60)).padStart(2, '0'));
const seconds = computed(() => String(remaining.value % 60).padStart(2, '0'));

const progress = computed(() =>
  initial.value > 0 ? Math.max(0, Math.min(1, remaining.value / initial.value)) : 0,
);

const presets = [30, 60, 300] as const;

function setPreset(value: number) {
  initial.value = value;
  start(value);
}

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
        Time remaining
      </div>
      <div
        class="mt-2 font-mono text-5xl font-bold tabular-nums transition-colors"
        :class="justFinished
          ? 'text-emerald-600 dark:text-emerald-400'
          : remaining <= 10 && remaining > 0
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-(--fg)'"
      >
        {{ minutes }}:{{ seconds }}
      </div>

      <div class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-(--bg-inset)">
        <div
          class="h-full rounded-full bg-(--accent) transition-[width] duration-300 ease-linear"
          :style="{ width: `${progress * 100}%` }"
        />
      </div>

      <div class="mt-3 flex items-center justify-center gap-2 text-xs text-(--fg-subtle)">
        <span
          class="inline-block size-2 rounded-full transition"
          :class="isActive ? 'bg-emerald-500' : justFinished ? 'bg-sky-500' : 'bg-(--border-strong)'"
        />
        {{ justFinished ? 'Completed' : isActive ? 'Counting down' : 'Paused' }}
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="preset in presets"
        :key="preset"
        class="rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium tabular-nums text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="setPreset(preset)"
      >
        {{ preset < 60 ? `${preset}s` : `${preset / 60}m` }}
      </button>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="remaining === 0 && isActive"
        @click="toggle"
      >
        {{ isActive ? 'Pause' : 'Resume' }}
      </button>
      <button
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="start()"
      >
        Restart
      </button>
      <button
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="stop"
      >
        Stop
      </button>
    </div>
  </div>
</template>
