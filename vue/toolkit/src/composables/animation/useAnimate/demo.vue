<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useAnimate } from './index';

const target = useTemplateRef<HTMLElement>('target');

const {
  isSupported,
  play,
  pause,
  reverse,
  finish,
  cancel,
  playState,
  currentTime,
  playbackRate,
} = useAnimate(
  target,
  [
    { transform: 'translateX(-3.5rem) rotate(0deg)', borderRadius: '0.75rem' },
    { transform: 'translateX(0) rotate(180deg)', borderRadius: '50%' },
    { transform: 'translateX(3.5rem) rotate(360deg)', borderRadius: '0.75rem' },
  ],
  {
    duration: 2000,
    iterations: Infinity,
    direction: 'alternate',
    easing: 'ease-in-out',
    immediate: false,
  },
);

const elapsed = computed(() => {
  const t = currentTime.value;
  return typeof t === 'number' ? `${(t / 1000).toFixed(2)}s` : '—';
});

const stateColor = computed(() => {
  switch (playState.value) {
    case 'running': return 'bg-emerald-500';
    case 'paused': return 'bg-amber-500';
    case 'finished': return 'bg-sky-500';
    default: return 'bg-(--border-strong)';
  }
});

const rates = [0.5, 1, 2] as const;
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400"
    >
      The Web Animations API is not supported in this browser.
    </div>

    <template v-else>
      <div class="flex h-28 items-center justify-center overflow-hidden rounded-xl border border-(--border) bg-(--bg-inset)">
        <div
          ref="target"
          class="size-12 bg-(--accent) shadow-lg"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
          <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
            State
          </div>
          <div class="mt-1 flex items-center gap-2">
            <span class="inline-block size-2 rounded-full transition" :class="stateColor" />
            <span class="font-mono text-sm text-(--fg)">{{ playState }}</span>
          </div>
        </div>
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
          <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
            Current time
          </div>
          <div class="mt-1 font-mono text-sm tabular-nums text-(--fg)">
            {{ elapsed }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
          @click="play"
        >
          Play
        </button>
        <button
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="pause"
        >
          Pause
        </button>
        <button
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="reverse"
        >
          Reverse
        </button>
        <button
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="finish"
        >
          Finish
        </button>
        <button
          class="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="cancel"
        >
          Cancel
        </button>
      </div>

      <div class="flex flex-col gap-2">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Playback rate
        </div>
        <div class="flex gap-2">
          <button
            v-for="rate in rates"
            :key="rate"
            class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium tabular-nums transition active:scale-[0.98] cursor-pointer"
            :class="playbackRate === rate
              ? 'border-transparent bg-(--accent) text-(--accent-fg)'
              : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
            @click="playbackRate = rate"
          >
            {{ rate }}×
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
