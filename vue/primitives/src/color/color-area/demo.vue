<script setup lang="ts">
import type { HSVA } from '@robonen/primitives';
import { ColorAreaRoot, ColorAreaThumb, hsvToRgb } from '@robonen/primitives';
import { computed, ref } from 'vue';

const color = ref<HSVA>({ h: 265, s: 0.72, v: 0.86, a: 1 });

const rgb = computed(() => hsvToRgb(color.value));
const cssColor = computed(() => `rgb(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b})`);
</script>

<template>
  <div class="demo-card flex w-full max-w-sm flex-col gap-5 p-6 text-fg">
    <div class="flex items-baseline justify-between text-sm">
      <span class="font-medium">Saturation / Brightness</span>
      <span class="font-mono text-fg-muted">
        S {{ Math.round(color.s * 100) }}% · V {{ Math.round(color.v * 100) }}%
      </span>
    </div>

    <!-- The SV square: hue base, white→transparent left-right, transparent→black top-bottom -->
    <ColorAreaRoot
      v-model="color"
      class="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-card border border-border shadow-(--shadow-card)"
      :style="{ backgroundColor: 'var(--color-area-hue)' }"
    >
      <!-- white (left) → transparent (right) -->
      <div
        class="pointer-events-none absolute inset-0"
        style="background: linear-gradient(to right, #fff, transparent)"
      />
      <!-- transparent (top) → black (bottom) -->
      <div
        class="pointer-events-none absolute inset-0"
        style="background: linear-gradient(to top, #000, transparent)"
      />

      <ColorAreaThumb
        aria-label="Saturation and brightness"
        class="absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md outline-none ring-1 ring-black/25 transition-[transform] focus-visible:ring-2 focus-visible:ring-ring hover:scale-110"
        :style="{ backgroundColor: cssColor }"
      />
    </ColorAreaRoot>

    <div class="flex items-center gap-3 rounded-card bg-bg-inset p-3">
      <span
        class="size-9 shrink-0 rounded-lg border border-border-strong"
        :style="{ backgroundColor: cssColor }"
      />
      <div class="flex flex-col text-sm leading-tight">
        <span class="font-mono text-fg">{{ cssColor }}</span>
        <span class="font-mono text-xs text-fg-subtle">
          hsv({{ Math.round(color.h) }}, {{ Math.round(color.s * 100) }}%, {{ Math.round(color.v * 100) }}%)
        </span>
      </div>
    </div>
  </div>
</template>
