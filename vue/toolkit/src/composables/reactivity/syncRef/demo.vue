<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { syncRef } from './index';

// Two refs kept in sync with a transform: Celsius <-> Fahrenheit.
const celsius = ref(20);
const fahrenheit = ref(68);

const { stop } = syncRef(celsius, fahrenheit, {
  direction: 'both',
  transform: {
    ltr: c => Math.round((c * 9) / 5 + 32),
    rtl: f => Math.round(((f - 32) * 5) / 9),
  },
});

const synced = ref(true);
function toggleSync() {
  if (synced.value) {
    stop();
    synced.value = false;
  }
}

onUnmounted(stop);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Two-way sync + transform</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="synced
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span
          class="size-1.5 rounded-full"
          :class="synced ? 'bg-emerald-500' : 'bg-(--fg-subtle)'"
        />
        {{ synced ? 'live' : 'stopped' }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <label class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-2">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Celsius</span>
        <input
          v-model.number="celsius"
          type="number"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-lg font-mono tabular-nums text-(--fg) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </label>
      <label class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-2">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Fahrenheit</span>
        <input
          v-model.number="fahrenheit"
          type="number"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-lg font-mono tabular-nums text-(--fg) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </label>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      {{ celsius }}°C ⇄ {{ fahrenheit }}°F
    </div>

    <input
      v-model.number="celsius"
      type="range"
      min="-20"
      max="40"
      step="1"
      class="w-full accent-(--accent) cursor-pointer"
      aria-label="Celsius slider"
    >

    <button
      type="button"
      :disabled="!synced"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
      @click="toggleSync"
    >
      Stop synchronization
    </button>
    <p v-if="!synced" class="text-xs text-(--fg-subtle) -mt-2">
      Watchers torn down — the two refs now drift independently.
    </p>
  </div>
</template>
