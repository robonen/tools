<script setup lang="ts">
import { ref } from 'vue';
import { useFloor } from './index';

const value = ref(5.95);

// Reactive Math.floor: recomputes whenever `value` changes.
const floored = useFloor(value);

function nudge(delta: number) {
  value.value = Math.round((value.value + delta) * 100) / 100;
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col items-center gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Math.floor</span>
      <div class="flex items-baseline gap-3 font-mono tabular-nums">
        <span class="text-2xl text-(--fg-muted)">{{ value.toFixed(2) }}</span>
        <span class="text-(--fg-subtle)">&rarr;</span>
        <span class="text-4xl font-bold text-(--fg)">{{ floored }}</span>
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Value</span>
        <input
          v-model.number="value"
          type="range"
          min="-10"
          max="10"
          step="0.01"
          class="w-full accent-(--accent)"
        >
      </label>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="nudge(-0.1)"
        >
          &minus;0.1
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="nudge(0.1)"
        >
          +0.1
        </button>
        <input
          v-model.number="value"
          type="number"
          step="0.01"
          class="ml-auto w-28 rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </div>

      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
        useFloor({{ value }}) === {{ floored }}
      </div>
    </div>
  </div>
</template>
