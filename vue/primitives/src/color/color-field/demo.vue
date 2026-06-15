<script setup lang="ts">
import type { HSVA, RGB } from '@robonen/primitives';
import {
  AlphaSliderRoot,
  AlphaSliderThumb,
  ColorAreaRoot,
  ColorAreaThumb,
  ColorFieldInput,
  ColorFieldLabel,
  ColorFieldRoot,
  ColorFieldSwatch,
  HueSliderRoot,
  HueSliderThumb,
  hsvToRgb,
} from '@robonen/primitives';
import { ref } from 'vue';

const color = ref('#7c5cff');

function hueRgb(hsva: HSVA): string {
  const { r, g, b } = hsvToRgb({ h: hsva.h, s: 1, v: 1 });
  return `rgb(${r}, ${g}, ${b})`;
}
function rgbStr(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}
function alphaGradient(rgb: RGB): string {
  return `linear-gradient(to right, rgba(${rgb.r},${rgb.g},${rgb.b},0), rgb(${rgb.r},${rgb.g},${rgb.b}))`;
}

const HUE_GRADIENT
  = 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)';

const CHECKER = {
  backgroundImage:
    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
  backgroundSize: '10px 10px',
  backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
  backgroundColor: '#fff',
} as const;
</script>

<template>
  <ColorFieldRoot
    v-slot="{ hsva, rgb, hex }"
    v-model="color"
    format="hex"
    class="demo-card flex w-full max-w-xs flex-col gap-4 p-5 text-fg"
  >
    <ColorFieldLabel class="text-sm font-medium">Pick a color</ColorFieldLabel>

    <!-- SV square -->
    <ColorAreaRoot
      class="relative aspect-square w-full touch-none select-none overflow-hidden rounded-card border border-border shadow-(--shadow-card)"
      :style="{ backgroundColor: 'var(--color-area-hue)' }"
    >
      <div
        class="pointer-events-none absolute inset-0"
        style="background: linear-gradient(to right, #fff, transparent)"
      />
      <div
        class="pointer-events-none absolute inset-0"
        style="background: linear-gradient(to top, #000, transparent)"
      />
      <ColorAreaThumb
        class="absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md outline-none ring-1 ring-black/25 transition-[transform] focus-visible:ring-2 focus-visible:ring-ring hover:scale-110"
        :style="{ backgroundColor: rgbStr(rgb) }"
      />
    </ColorAreaRoot>

    <!-- Hue + alpha rails -->
    <div class="flex flex-col gap-3">
      <HueSliderRoot
        class="relative block h-3.5 w-full touch-none select-none rounded-full border border-border"
        :style="{ background: HUE_GRADIENT }"
      >
        <HueSliderThumb
          class="absolute top-1/2 z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md outline-none ring-1 ring-black/25 transition-[transform] focus-visible:ring-2 focus-visible:ring-ring hover:scale-110"
          :style="{ backgroundColor: hueRgb(hsva) }"
        />
      </HueSliderRoot>

      <AlphaSliderRoot
        class="relative block h-3.5 w-full touch-none select-none rounded-full border border-border"
        :style="CHECKER"
      >
        <div
          class="pointer-events-none absolute inset-0 rounded-full"
          :style="{ backgroundImage: alphaGradient(rgb) }"
        />
        <AlphaSliderThumb
          class="absolute top-1/2 z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md outline-none ring-1 ring-black/25 transition-[transform] focus-visible:ring-2 focus-visible:ring-ring hover:scale-110"
          :style="{ backgroundColor: rgbStr(rgb) }"
        />
      </AlphaSliderRoot>
    </div>

    <!-- Swatch + editable text input -->
    <div class="flex items-center gap-2 rounded-card bg-bg-inset p-2">
      <span
        class="size-9 shrink-0 overflow-hidden rounded-lg border border-border-strong"
        :style="CHECKER"
      >
        <ColorFieldSwatch class="block size-full" />
      </span>
      <ColorFieldInput
        class="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 font-mono text-sm text-fg uppercase outline-none transition focus-visible:ring-2 focus-visible:ring-ring data-[invalid]:border-red-500 data-[invalid]:text-red-500"
        spellcheck="false"
        autocomplete="off"
      />
    </div>

    <p class="font-mono text-xs text-fg-subtle">
      v-model → <span class="text-fg-muted">{{ hex }}</span>
    </p>
  </ColorFieldRoot>
</template>
