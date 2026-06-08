<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProjection } from './index';

// Source value lives in a temperature domain.
const celsius = ref(22);

const clamp = ref(false);
const options = computed(() => ({ clamp: clamp.value }));

// Same reactive source projected into several target domains at once.
const fahrenheit = useProjection(celsius, [0, 100], [32, 212], options);
const fraction = useProjection(celsius, [0, 40], [0, 1], options);
const percent = useProjection(celsius, [0, 40], [0, 100], options);
const hue = useProjection(celsius, [0, 40], [210, 0], options);

const barWidth = computed(() => `${Math.max(0, Math.min(100, percent.value))}%`);
const swatch = computed(() => `hsl(${hue.value} 80% 50%)`);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">source · °C</span>
        <span class="font-mono text-sm text-(--fg-muted)">domain [0, 40]</span>
      </div>
      <div class="mt-1 flex items-center gap-3">
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ celsius }}°</span>
        <span
          class="size-6 shrink-0 rounded-full border border-(--border)"
          :style="{ backgroundColor: swatch }"
        />
      </div>
      <input
        v-model.number="celsius"
        type="range"
        min="-10"
        max="50"
        step="1"
        class="mt-3 w-full accent-(--accent)"
      >
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <span class="text-sm text-(--fg-muted)">→ °F <span class="font-mono text-xs text-(--fg-subtle)">[32, 212]</span></span>
        <span class="font-mono text-sm font-bold tabular-nums text-(--fg)">{{ fahrenheit.toFixed(1) }}</span>
      </div>
      <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <span class="text-sm text-(--fg-muted)">→ fraction <span class="font-mono text-xs text-(--fg-subtle)">[0, 1]</span></span>
        <span class="font-mono text-sm font-bold tabular-nums text-(--fg)">{{ fraction.toFixed(3) }}</span>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-(--fg-muted)">→ percent <span class="font-mono text-xs text-(--fg-subtle)">[0, 100]</span></span>
          <span class="font-mono text-sm font-bold tabular-nums text-(--fg)">{{ percent.toFixed(0) }}%</span>
        </div>
        <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-(--bg)">
          <div
            class="h-full rounded-full bg-(--accent) transition-[width] duration-200"
            :style="{ width: barWidth }"
          />
        </div>
      </div>
    </div>

    <label class="flex items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="flex flex-col">
        <span class="text-sm font-medium text-(--fg)">Clamp to domain</span>
        <span class="text-xs text-(--fg-subtle)">prevent extrapolation past bounds</span>
      </span>
      <input v-model="clamp" type="checkbox" class="size-4 accent-(--accent)">
    </label>
  </div>
</template>
