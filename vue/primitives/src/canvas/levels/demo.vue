<script setup lang="ts">
import type { LevelsValue } from '@robonen/primitives';
import { LevelsRoot, LevelsThumb, LevelsTrack } from '@robonen/primitives';
import { ref } from 'vue';

// A starting adjustment: clip the shadows a touch, lift midtones, pull highlights.
const levels = ref<LevelsValue>({
  black: 20,
  gamma: 1.2,
  white: 235,
  outputBlack: 0,
  outputWhite: 255,
});

/** Build the SVG polyline points for a 0..255 → 0..255 output curve. */
function curvePoints(curve: number[]): string {
  const last = curve.length - 1;
  return curve
    .map((out, i) => {
      const x = (i / last) * 100;
      const y = 100 - (out / 255) * 100; // SVG y grows downward
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}
</script>

<template>
  <div class="demo-card w-full max-w-md space-y-6 p-6 text-fg">
    <div class="flex items-baseline justify-between text-sm">
      <span class="font-medium">Levels</span>
      <span class="font-mono text-fg-muted">
        {{ levels.black }} · {{ levels.gamma.toFixed(2) }} · {{ levels.white }}
      </span>
    </div>

    <LevelsRoot v-model="levels" class="space-y-6">
      <template #default="{ value, getOutputCurve }">
        <!-- Output-curve preview, driven by the live LUT -->
        <div class="relative aspect-[2/1] w-full overflow-hidden rounded-card border border-border bg-bg-inset shadow-(--shadow-card)">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 size-full">
            <!-- identity reference -->
            <line x1="0" y1="100" x2="100" y2="0" class="stroke-border-strong" stroke-width="0.5" stroke-dasharray="2 2" />
            <!-- the live levels curve -->
            <polyline
              :points="curvePoints(getOutputCurve(64))"
              fill="none"
              class="stroke-accent"
              stroke-width="1.5"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        </div>

        <!-- Input track: black / gamma / white thumbs on a shadows→highlights rail -->
        <div class="space-y-2">
          <span class="text-xs font-medium text-fg-muted">Input</span>
          <LevelsTrack
            class="relative h-3 w-full touch-none select-none rounded-full"
            style="background: linear-gradient(to right, #000, #fff)"
          >
            <LevelsThumb
              kind="black"
              class="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none rounded-full border-2 border-white bg-black shadow-md outline-none ring-1 ring-black/40 transition-transform focus-visible:ring-2 focus-visible:ring-ring hover:scale-115"
            />
            <LevelsThumb
              kind="gamma"
              class="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none rounded-full border-2 border-white bg-[#888] shadow-md outline-none ring-1 ring-black/40 transition-transform focus-visible:ring-2 focus-visible:ring-ring hover:scale-115"
            />
            <LevelsThumb
              kind="white"
              class="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none rounded-full border-2 border-border-strong bg-white shadow-md outline-none ring-1 ring-black/20 transition-transform focus-visible:ring-2 focus-visible:ring-ring hover:scale-115"
            />
          </LevelsTrack>
        </div>

        <!-- Output track: the outputBlack / outputWhite pair -->
        <div class="space-y-2">
          <span class="text-xs font-medium text-fg-muted">Output</span>
          <LevelsTrack
            class="relative h-3 w-full touch-none select-none rounded-full"
            style="background: linear-gradient(to right, #000, #fff)"
          >
            <LevelsThumb
              kind="outputBlack"
              class="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none rounded-full border-2 border-white bg-black shadow-md outline-none ring-1 ring-black/40 transition-transform focus-visible:ring-2 focus-visible:ring-ring hover:scale-115"
            />
            <LevelsThumb
              kind="outputWhite"
              class="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none rounded-full border-2 border-border-strong bg-white shadow-md outline-none ring-1 ring-black/20 transition-transform focus-visible:ring-2 focus-visible:ring-ring hover:scale-115"
            />
          </LevelsTrack>
        </div>

        <!-- Live readout of all five handles -->
        <dl class="grid grid-cols-5 gap-2 rounded-card bg-bg-inset p-3 text-center font-mono text-xs">
          <div>
            <dt class="text-fg-subtle">Black</dt>
            <dd class="text-fg">{{ value.black }}</dd>
          </div>
          <div>
            <dt class="text-fg-subtle">Gamma</dt>
            <dd class="text-fg">{{ value.gamma.toFixed(2) }}</dd>
          </div>
          <div>
            <dt class="text-fg-subtle">White</dt>
            <dd class="text-fg">{{ value.white }}</dd>
          </div>
          <div>
            <dt class="text-fg-subtle">Out lo</dt>
            <dd class="text-fg">{{ value.outputBlack }}</dd>
          </div>
          <div>
            <dt class="text-fg-subtle">Out hi</dt>
            <dd class="text-fg">{{ value.outputWhite }}</dd>
          </div>
        </dl>
      </template>
    </LevelsRoot>
  </div>
</template>
