<script setup lang="ts">
import type { HSVA } from '@robonen/primitives';
import { AlphaSliderRoot, AlphaSliderThumb, hsvToRgb } from '@robonen/primitives';
import { computed, ref } from 'vue';

const color = ref<HSVA>({ h: 145, s: 0.85, v: 0.8, a: 0.6 });

const rgb = computed(() => hsvToRgb(color.value));
// Opaque end of the gradient (alpha → 1) and the live colour at the current alpha.
const opaque = computed(() => `rgb(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b})`);
const transparent = computed(() => `rgba(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b}, 0)`);
const live = computed(() => `rgba(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b}, ${color.value.a})`);

const gradient = computed(() => `linear-gradient(to right, ${transparent.value}, ${opaque.value})`);

// Reusable checkerboard background for the rail and the preview chip.
const CHECKER = {
  backgroundImage:
    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
  backgroundSize: '10px 10px',
  backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
  backgroundColor: '#fff',
} as const;
</script>

<template>
  <div class="demo-card flex w-full max-w-sm flex-col gap-5 p-6 text-fg">
    <div class="flex items-baseline justify-between text-sm">
      <span class="font-medium">Alpha</span>
      <span class="font-mono text-fg-muted">{{ Math.round(color.a * 100) }}%</span>
    </div>

    <!-- The alpha rail: checkerboard underlay, gradient overlay; the root span IS the track -->
    <AlphaSliderRoot
      v-model="color"
      class="relative block h-4 w-full touch-none select-none rounded-full border border-border shadow-(--shadow-card)"
      :style="CHECKER"
    >
      <div
        class="pointer-events-none absolute inset-0 rounded-full"
        :style="{ backgroundImage: gradient }"
      />
      <AlphaSliderThumb
        aria-label="Alpha"
        class="absolute top-1/2 z-10 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md outline-none ring-1 ring-black/25 transition-[transform] focus-visible:ring-2 focus-visible:ring-ring hover:scale-110"
        :style="{ backgroundColor: live }"
      />
    </AlphaSliderRoot>

    <div class="flex items-center gap-3 rounded-card bg-bg-inset p-3">
      <span
        class="size-9 shrink-0 overflow-hidden rounded-lg border border-border-strong"
        :style="CHECKER"
      >
        <span class="block size-full" :style="{ backgroundColor: live }" />
      </span>
      <div class="flex flex-col text-sm leading-tight">
        <span class="font-mono text-fg">{{ live }}</span>
        <span class="font-mono text-xs text-fg-subtle">opacity {{ color.a.toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>
