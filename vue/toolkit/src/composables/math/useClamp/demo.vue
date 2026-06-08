<script setup lang="ts">
import { ref } from 'vue';
import { useClamp } from './index';

const min = ref(20);
const max = ref(80);
const raw = ref(50);

// useClamp returns a WritableComputedRef when given a ref: writing through it
// clamps the underlying value back into [min, max].
const clamped = useClamp(raw, min, max);

const presets = [-30, 0, 50, 100, 130];
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex items-end justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Clamped</span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ clamped }}</span>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between text-xs text-(--fg-muted)">
          <span>{{ min }}</span>
          <span>range</span>
          <span>{{ max }}</span>
        </div>
        <div class="relative h-2 rounded-full bg-(--bg-inset)">
          <div
            class="absolute top-0 h-2 rounded-full bg-(--accent-subtle)"
            :style="{ left: `${min}%`, width: `${Math.max(0, max - min)}%` }"
          />
          <div
            class="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-(--bg-elevated) bg-(--accent) shadow transition-[left]"
            :style="{ left: `${clamped}%` }"
          />
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Input value</span>
        <input
          v-model.number="raw"
          type="range"
          min="-50"
          max="150"
          class="w-full accent-(--accent)"
        >
        <span class="font-mono text-sm tabular-nums text-(--fg-muted)">raw = {{ raw }}</span>
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Min</span>
          <input
            v-model.number="min"
            type="number"
            class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          >
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Max</span>
          <input
            v-model.number="max"
            type="number"
            class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          >
        </label>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in presets"
          :key="p"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="clamped = p"
        >
          set {{ p }}
        </button>
      </div>
      <p class="text-xs text-(--fg-subtle)">
        The buttons write straight through the clamped ref &mdash; values outside the range snap to the nearest bound.
      </p>
    </div>
  </div>
</template>
