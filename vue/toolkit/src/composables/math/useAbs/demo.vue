<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAbs } from './index';

const value = ref(-42);
const abs = useAbs(value);

// Map the current value (-100..100) to a 0..100% offset for the marker.
const markerLeft = computed(() => `${(value.value + 100) / 2}%`);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-5">
    <div class="flex items-end justify-between">
      <div class="flex flex-col">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">value</span>
        <span class="font-mono text-2xl font-bold tabular-nums text-(--fg-muted)">{{ value }}</span>
      </div>
      <div class="flex flex-col items-end">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">|value|</span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ abs }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <input
        v-model.number="value"
        type="range"
        min="-100"
        max="100"
        step="1"
        class="w-full cursor-pointer accent-(--accent)"
      >
      <div class="relative h-2 rounded-full bg-(--bg-inset)">
        <div class="absolute inset-y-0 left-1/2 w-px bg-(--border-strong)" />
        <div
          class="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-(--bg) bg-(--accent) transition-[left] duration-75"
          :style="{ left: markerLeft }"
        />
      </div>
      <div class="flex justify-between font-mono text-xs text-(--fg-subtle) tabular-nums">
        <span>-100</span>
        <span>0</span>
        <span>100</span>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center font-mono text-sm text-(--fg) tabular-nums">
      Math.abs({{ value }}) = {{ abs }}
    </div>
  </div>
</template>
