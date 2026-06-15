<script setup lang="ts">
import type { HistogramChannel, HistogramScaleType } from '@robonen/primitives';
import { HISTOGRAM_CHANNEL_COLORS, HistogramBars, HistogramRoot } from '@robonen/primitives';
import { computed, ref } from 'vue';

const BINS = 64;

/** A bell-ish bump centred on `center` (in bins) with the given spread + peak. */
function bell(center: number, spread: number, peak: number): number[] {
  return Array.from({ length: BINS }, (_, i) => {
    const d = (i - center) / spread;
    return Math.round(peak * Math.exp(-0.5 * d * d));
  });
}

/** Sum two distributions bin-by-bin (a midtone hump + a brighter highlight bump). */
function add(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + (b[i] ?? 0));
}

// Synthetic per-channel data: each primary peaks at a slightly different tone,
// plus a shared luminance curve. Tall central spike to show off the log view.
const data = {
  l: add(bell(28, 9, 1000), bell(50, 5, 280)),
  r: add(bell(34, 10, 760), bell(52, 6, 220)),
  g: add(bell(26, 8, 940), bell(46, 5, 180)),
  b: add(bell(20, 11, 620), bell(44, 7, 120)),
};

const channel = ref<HistogramChannel>('l');
const scaleType = ref<HistogramScaleType>('linear');

const channelOptions: Array<{ value: HistogramChannel; label: string }> = [
  { value: 'l', label: 'Luminance' },
  { value: 'rgb', label: 'RGB' },
  { value: 'r', label: 'Red' },
  { value: 'g', label: 'Green' },
  { value: 'b', label: 'Blue' },
];

const scaleOptions: HistogramScaleType[] = ['linear', 'log'];

const channelLabel = computed(
  () => channelOptions.find(o => o.value === channel.value)?.label ?? '',
);
</script>

<template>
  <div class="demo-card w-full max-w-md space-y-5 p-6 text-fg">
    <div class="flex items-baseline justify-between text-sm">
      <span class="font-medium">{{ channelLabel }} histogram</span>
      <span class="font-mono text-fg-muted">{{ scaleType }}</span>
    </div>

    <!-- The histogram. Root normalises each channel against its own peak. -->
    <HistogramRoot
      :data="data"
      :channel="channel"
      :scale-type="scaleType"
      :bins="BINS"
      class="rounded-card border border-border bg-bg-inset p-3 shadow-(--shadow-card)"
    >
      <!-- Bars: overlay each requested channel as a row of positioned spans -->
      <HistogramBars class="relative grid h-32 w-full">
        <template #default="{ channel: ch, color, heights }">
          <div
            class="pointer-events-none absolute inset-0 flex items-end gap-px"
            :style="{ color }"
            :data-channel="ch"
          >
            <span
              v-for="(h, i) in heights"
              :key="i"
              class="min-w-0 flex-1 rounded-t-sm"
              :style="{
                height: `${h * 100}%`,
                background: 'currentColor',
                opacity: channel === 'rgb' ? 0.55 : 0.9,
                mixBlendMode: channel === 'rgb' ? 'screen' : 'normal',
              }"
            />
          </div>
        </template>
      </HistogramBars>

      <!-- Tonal axis: shadows → highlights -->
      <div class="mt-2 h-1.5 w-full rounded-full" style="background: linear-gradient(to right, #000, #fff)" />
    </HistogramRoot>

    <!-- Channel toggle -->
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="opt in channelOptions"
        :key="opt.value"
        type="button"
        class="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        :class="channel === opt.value
          ? 'border-transparent bg-accent text-accent-text'
          : 'border-border bg-bg text-fg-muted hover:bg-bg-elevated'"
        @click="channel = opt.value"
      >
        <span
          v-if="opt.value !== 'rgb' && opt.value !== 'l'"
          class="size-2 rounded-full"
          :style="{ backgroundColor: HISTOGRAM_CHANNEL_COLORS[opt.value] }"
        />
        {{ opt.label }}
      </button>
    </div>

    <!-- Linear / log toggle -->
    <div class="flex items-center gap-2 text-sm">
      <span class="text-fg-muted">Scale</span>
      <div class="inline-flex rounded-card border border-border bg-bg p-0.5">
        <button
          v-for="opt in scaleOptions"
          :key="opt"
          type="button"
          class="rounded-[6px] px-3 py-1 text-xs font-medium capitalize outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          :class="scaleType === opt
            ? 'bg-accent text-accent-text'
            : 'text-fg-muted hover:text-fg'"
          @click="scaleType = opt"
        >
          {{ opt }}
        </button>
      </div>
    </div>
  </div>
</template>
