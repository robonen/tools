<script setup lang="ts">
import { computed, ref } from 'vue';
import { TransitionPresets, useTransition } from './index';

type PresetName = keyof typeof TransitionPresets;

const presetNames = Object.keys(TransitionPresets) as PresetName[];
const preset = ref<PresetName>('easeOutCubic');
const duration = ref(800);

// Animated progress value (0–100).
const target = ref(72);
const value = useTransition(target, {
  duration,
  transition: computed(() => TransitionPresets[preset.value]),
});

// Animated color tuple (RGB).
const swatches: Array<[string, [number, number, number]]> = [
  ['Indigo', [99, 102, 241]],
  ['Emerald', [16, 185, 129]],
  ['Amber', [245, 158, 11]],
  ['Rose', [244, 63, 94]],
];
const colorTarget = ref<[number, number, number]>([99, 102, 241]);
const color = useTransition(colorTarget, {
  duration: 600,
  transition: TransitionPresets.easeInOutQuad,
});

const colorCss = computed(() => {
  const [r, g, b] = color.value;
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
});

function randomize() {
  target.value = Math.round(Math.random() * 100);
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-5">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-baseline justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Eased value
        </span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">
          {{ value.toFixed(1) }}
        </span>
      </div>

      <div class="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-(--bg-inset)">
        <div
          class="h-full rounded-full bg-(--accent)"
          :style="{ width: `${Math.max(0, Math.min(100, value))}%` }"
        />
      </div>

      <div class="mt-4 flex items-center gap-3">
        <input
          v-model.number="target"
          type="range"
          min="0"
          max="100"
          class="h-1.5 flex-1 cursor-pointer accent-(--accent)"
        >
        <button
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="randomize"
        >
          Random
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Easing preset
      </label>
      <select
        v-model="preset"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
        <option v-for="name in presetNames" :key="name" :value="name">
          {{ name }}
        </option>
      </select>

      <label class="mt-1 flex items-center justify-between text-sm text-(--fg-muted)">
        <span>Duration</span>
        <span class="font-mono text-(--fg) tabular-nums">{{ duration }}ms</span>
      </label>
      <input
        v-model.number="duration"
        type="range"
        min="100"
        max="2000"
        step="100"
        class="h-1.5 w-full cursor-pointer accent-(--accent)"
      >
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-center gap-3">
        <div
          class="size-12 shrink-0 rounded-lg border border-(--border)"
          :style="{ backgroundColor: colorCss }"
        />
        <div class="min-w-0">
          <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
            Animated tuple
          </div>
          <div class="font-mono text-sm text-(--fg) tabular-nums">
            {{ colorCss }}
          </div>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="[label, rgb] in swatches"
          :key="label"
          class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted) transition hover:border-(--border-strong) cursor-pointer"
          @click="colorTarget = [...rgb]"
        >
          <span class="size-2.5 rounded-full" :style="{ backgroundColor: `rgb(${rgb.join(',')})` }" />
          {{ label }}
        </button>
      </div>
    </div>
  </div>
</template>
