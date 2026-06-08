<script setup lang="ts">
import { computed } from 'vue';
import { useNow } from './index';

const { now, isActive, pause, resume, toggle } = useNow({ controls: true, interval: 'requestAnimationFrame' });

const time = computed(() =>
  now.value.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
);
const millis = computed(() => now.value.getMilliseconds().toString().padStart(3, '0'));
const date = computed(() =>
  now.value.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
);

// A sweeping second hand driven entirely by the reactive `now`.
const secondAngle = computed(() => {
  const seconds = now.value.getSeconds() + now.value.getMilliseconds() / 1000;
  return seconds / 60 * 360;
});
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col items-center gap-3">
      <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Reactive now</div>

      <div class="flex items-baseline gap-1">
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ time }}</span>
        <span class="font-mono text-lg font-semibold tabular-nums text-(--fg-subtle)">.{{ millis }}</span>
      </div>

      <div class="text-sm text-(--fg-muted)">{{ date }}</div>

      <div class="relative mt-1 size-24 rounded-full border-2 border-(--border-strong) bg-(--bg-inset)">
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="size-1.5 rounded-full bg-(--accent)" />
        </div>
        <div
          class="absolute bottom-1/2 left-1/2 h-9 w-0.5 origin-bottom rounded-full bg-(--accent)"
          :style="{ transform: `translateX(-50%) rotate(${secondAngle}deg)` }"
        />
      </div>
    </div>

    <div class="flex items-center justify-between gap-3">
      <span
        class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
      >
        <span
          class="size-1.5 rounded-full transition"
          :class="isActive ? 'bg-emerald-500' : 'bg-(--fg-subtle)'"
        />
        {{ isActive ? 'Ticking (RAF)' : 'Paused' }}
      </span>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="toggle"
        >
          {{ isActive ? 'Pause' : 'Resume' }}
        </button>
        <button
          type="button"
          :disabled="isActive"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="resume"
        >
          Resume
        </button>
        <button
          type="button"
          :disabled="!isActive"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="pause"
        >
          Pause
        </button>
      </div>
    </div>
  </div>
</template>
