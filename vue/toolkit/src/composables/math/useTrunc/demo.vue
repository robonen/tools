<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTrunc } from './index';

const value = ref(2.9);
const truncated = useTrunc(value);

// The fractional part discarded by Math.trunc, for a side-by-side comparison.
const fractional = computed(() => value.value - truncated.value);

const samples = [2.9, -3.7, 42.0001, -0.5, 99.999];
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col items-center gap-1 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">truncated</span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ truncated }}</span>
      </div>
      <div class="flex flex-col items-center gap-1 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">dropped</span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg-muted)">{{ fractional.toFixed(3) }}</span>
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <label class="flex items-center justify-between text-sm font-medium text-(--fg)">
        <span>Value</span>
        <span class="font-mono tabular-nums text-(--fg-muted)">{{ value }}</span>
      </label>
      <input
        v-model.number="value"
        type="range"
        min="-10"
        max="10"
        step="0.01"
        class="mt-2 w-full accent-(--accent)"
      >
    </div>

    <div>
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Samples</span>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="(s, i) in samples"
          :key="i"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted) transition hover:border-(--border-strong) hover:text-(--fg) cursor-pointer"
          @click="value = s"
        >
          {{ s }}
        </button>
      </div>
    </div>
  </div>
</template>
