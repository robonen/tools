<script setup lang="ts">
import { computed, ref } from 'vue';
import { extendRef } from './index';

// A plain ref carrying its own derived + imperative API.
const baseVolume = ref(40);

const volume = extendRef(baseVolume, {
  // reactive (unwrapped) — read without .value
  percent: computed(() => `${baseVolume.value}%`),
  isMuted: computed(() => baseVolume.value === 0),
  // imperative helpers attached to the same ref
  mute: () => { baseVolume.value = 0; },
  max: () => { baseVolume.value = 100; },
});

let lastMuted = 50;
function toggleMute() {
  if (volume.isMuted) {
    volume.value = lastMuted;
  }
  else {
    lastMuted = volume.value || 50;
    volume.mute();
  }
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Volume</span>
        <span
          class="font-mono text-3xl font-bold tabular-nums transition-colors"
          :class="volume.isMuted ? 'text-(--fg-subtle)' : 'text-(--fg)'"
        >{{ volume.percent }}</span>
      </div>

      <!-- bind the ref directly with v-model — it's still a ref -->
      <input
        v-model.number="volume"
        type="range"
        min="0"
        max="100"
        class="w-full accent-(--accent)"
      >

      <div class="flex gap-1.5">
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="toggleMute"
        >
          {{ volume.isMuted ? 'Unmute' : 'Mute' }}
        </button>
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="volume.max()"
        >
          Max
        </button>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex flex-col gap-2 font-mono text-sm tabular-nums">
      <div class="flex items-center justify-between">
        <span class="text-(--fg-muted)">volume.value</span>
        <span class="text-(--fg)">{{ volume.value }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-(--fg-muted)">volume.percent</span>
        <span class="text-(--fg)">{{ volume.percent }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-(--fg-muted)">volume.isMuted</span>
        <span :class="volume.isMuted ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'">
          {{ volume.isMuted }}
        </span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      One ref carries its value, derived properties, and methods — no destructuring of an object needed.
    </p>
  </div>
</template>
