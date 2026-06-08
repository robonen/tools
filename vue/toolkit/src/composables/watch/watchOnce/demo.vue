<script setup lang="ts">
import { ref } from 'vue';
import { watchOnce } from './index';

// "First interaction" capture: watchOnce fires for the very first change to
// the source and then tears itself down — later changes are ignored. Great for
// recording the moment a user first engages with something.
const volume = ref(50);
const firstTouch = ref<number | null>(null);
const totalChanges = ref(0);
const armed = ref(true);

function arm() {
  firstTouch.value = null;
  totalChanges.value = 0;
  volume.value = 50;
  armed.value = true;

  watchOnce(volume, (value) => {
    firstTouch.value = value;
    armed.value = false;
  });
}

// Arm immediately on setup (re-arming resets the demo).
arm();

function onInput() {
  totalChanges.value++;
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Volume</span>
        <span class="font-mono text-sm text-(--fg) tabular-nums">{{ volume }}</span>
      </div>
      <input
        v-model.number="volume"
        type="range"
        min="0"
        max="100"
        class="w-full accent-(--accent) cursor-pointer"
        @input="onInput"
      >
    </div>

    <div
      class="rounded-lg border bg-(--bg-inset) p-3 flex items-center justify-between transition"
      :class="firstTouch === null ? 'border-(--border)' : 'border-emerald-500/30'"
    >
      <div class="flex flex-col">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">First captured value</span>
        <span
          class="font-mono text-2xl font-bold tabular-nums"
          :class="firstTouch === null ? 'text-(--fg-subtle)' : 'text-emerald-600 dark:text-emerald-400'"
        >
          {{ firstTouch === null ? '—' : firstTouch }}
        </span>
      </div>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="armed
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span class="size-1.5 rounded-full" :class="armed ? 'bg-amber-500 animate-pulse' : 'bg-(--border-strong)'" />
        {{ armed ? 'Armed' : 'Spent' }}
      </span>
    </div>

    <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-sm">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Total drags</span>
      <span class="font-mono text-(--fg) tabular-nums">{{ totalChanges }}</span>
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
      @click="arm"
    >
      Re-arm watcher
    </button>

    <p class="text-xs text-(--fg-subtle)">
      Drag the slider — only the <span class="font-mono text-(--fg-muted)">first</span> change is captured,
      then the watcher stops. Total drags keeps climbing to prove it.
    </p>
  </div>
</template>
