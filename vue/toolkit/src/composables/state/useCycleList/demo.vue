<script setup lang="ts">
import { computed } from 'vue';
import { useCycleList } from './index';

// Cycle through a small palette of theme accents.
interface Swatch {
  name: string;
  hex: string;
}

const palette: Swatch[] = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Sky', hex: '#0ea5e9' },
];

const { state, index, next, prev, go } = useCycleList(palette, {
  getIndexOf: (value, list) => list.findIndex(item => item.hex === value.hex),
});

const position = computed(() => `${index.value + 1} / ${palette.length}`);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Accent</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted) tabular-nums">
          {{ position }}
        </span>
      </div>

      <!-- Live preview of the currently selected swatch -->
      <div class="flex items-center gap-4">
        <div
          class="size-16 shrink-0 rounded-xl border border-(--border-strong) shadow-inner transition-colors duration-300"
          :style="{ backgroundColor: state.hex }"
        />
        <div class="flex flex-col gap-1">
          <span class="text-lg font-semibold text-(--fg)">{{ state.name }}</span>
          <span class="font-mono text-sm uppercase tabular-nums text-(--fg-muted)">{{ state.hex }}</span>
        </div>
      </div>

      <!-- prev / next controls -->
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="prev()"
        >
          ← Prev
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
          @click="next()"
        >
          Next →
        </button>
      </div>
    </div>

    <!-- index.value is writable: tap any swatch to jump straight to it -->
    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Jump to</span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(swatch, i) in palette"
          :key="swatch.hex"
          type="button"
          :aria-pressed="i === index"
          :title="swatch.name"
          class="size-9 rounded-lg border-2 transition active:scale-[0.95] cursor-pointer"
          :class="i === index ? 'border-(--accent) scale-110' : 'border-(--border) hover:border-(--border-strong)'"
          :style="{ backgroundColor: swatch.hex }"
          @click="go(i)"
        />
      </div>
      <p class="text-xs text-(--fg-subtle)">
        Tabs call <span class="font-mono text-(--fg-muted)">go(i)</span>; arrows wrap around with
        <span class="font-mono text-(--fg-muted)">next/prev</span>.
      </p>
    </div>
  </div>
</template>
