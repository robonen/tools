<script setup lang="ts">
import type { HSVA } from '@robonen/primitives';
import { HueSliderRoot, HueSliderThumb, hsvToRgb } from '@robonen/primitives';
import { computed, ref } from 'vue';

const color = ref<HSVA>({ h: 210, s: 1, v: 1, a: 1 });

const rgb = computed(() => hsvToRgb({ h: color.value.h, s: 1, v: 1 }));
const hueColor = computed(() => `rgb(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b})`);

const HUE_GRADIENT
  = 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)';
</script>

<template>
  <div class="demo-card flex w-full max-w-sm flex-col gap-5 p-6 text-fg">
    <div class="flex items-baseline justify-between text-sm">
      <span class="font-medium">Hue</span>
      <span class="font-mono text-fg-muted">{{ Math.round(color.h) }}°</span>
    </div>

    <!-- The hue rail: the root span IS the track -->
    <HueSliderRoot
      v-model="color"
      class="relative block h-4 w-full touch-none select-none rounded-full border border-border shadow-(--shadow-card)"
      :style="{ background: HUE_GRADIENT }"
    >
      <HueSliderThumb
        aria-label="Hue"
        class="absolute top-1/2 z-10 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md outline-none ring-1 ring-black/25 transition-[transform] focus-visible:ring-2 focus-visible:ring-ring hover:scale-110"
        :style="{ backgroundColor: hueColor }"
      />
    </HueSliderRoot>

    <div class="flex items-center gap-3 rounded-card bg-bg-inset p-3">
      <span
        class="size-9 shrink-0 rounded-lg border border-border-strong"
        :style="{ backgroundColor: hueColor }"
      />
      <div class="flex flex-col text-sm leading-tight">
        <span class="font-mono text-fg">{{ hueColor }}</span>
        <span class="font-mono text-xs text-fg-subtle">hue {{ Math.round(color.h) }}° of 360°</span>
      </div>
    </div>
  </div>
</template>
