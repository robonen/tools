<script setup lang="ts">
import { computed } from 'vue';
import { useDevicePixelRatio } from './index';

const { pixelRatio } = useDevicePixelRatio();

// A DPR > 1 means the display packs more physical pixels per CSS pixel
// (Retina / HiDPI), which also flips on browser zoom.
const classification = computed(() => {
  if (pixelRatio.value >= 3) return 'Ultra HiDPI';
  if (pixelRatio.value >= 2) return 'Retina / HiDPI';
  if (pixelRatio.value > 1) return 'Scaled';
  return 'Standard';
});

// One CSS pixel maps to dpr² physical pixels across both axes.
const physicalPerCss = computed(() => (pixelRatio.value ** 2).toFixed(2));
const ratioLabel = computed(() => `${pixelRatio.value} dppx`);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Device Pixel Ratio</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          <span class="size-1.5 rounded-full bg-(--accent)" />
          {{ classification }}
        </span>
      </div>

      <div class="flex items-end gap-2">
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ pixelRatio }}</span>
        <span class="pb-1 text-sm text-(--fg-subtle)">{{ ratioLabel }}</span>
      </div>

      <!-- Visualise how a single CSS pixel maps onto a grid of physical pixels -->
      <div class="flex items-center gap-3">
        <div
          class="grid flex-shrink-0 gap-px rounded-md border border-(--border-strong) bg-(--bg-inset) p-1 transition-all"
          :style="{
            gridTemplateColumns: `repeat(${Math.max(1, Math.round(pixelRatio))}, 0.75rem)`,
            gridTemplateRows: `repeat(${Math.max(1, Math.round(pixelRatio))}, 0.75rem)`,
          }"
        >
          <span
            v-for="n in Math.max(1, Math.round(pixelRatio)) ** 2"
            :key="n"
            class="size-3 rounded-[3px] bg-(--accent)/80"
          />
        </div>
        <p class="text-xs text-(--fg-muted)">
          1 CSS pixel is rendered with about
          <span class="font-mono font-semibold text-(--fg)">{{ physicalPerCss }}</span>
          physical pixels.
        </p>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Zoom the page (Cmd/Ctrl + and -) or drag this window to a monitor with a different scale to watch the ratio update live.
    </p>
  </div>
</template>
