<script lang="ts">
import type { HistogramBarChannel, HistogramChannel, HistogramData, HistogramScaleType } from './utils';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A headless, accessible per-channel image histogram. The root owns the bin
 * `data` (single-channel `number[]` or a per-channel record), normalises each
 * channel against its own peak under the chosen `scaleType` (`'linear'` or
 * `'log'`), and provides the resulting `[0, 1]` bar heights to `HistogramBars`.
 * It is a dense visual: the rendered bars are `aria-hidden`, while the root
 * carries `role="img"` with an `aria-label` summary (or `role="group"`).
 *
 * The all-zero / empty guard is built in — a flat or empty histogram projects to
 * zero height (no divide-by-zero, no `NaN`) and the summary label reports
 * "no data". Pair it with `LevelsRoot` for a Photoshop-style levels editor, or
 * use it standalone to visualise tonal distribution.
 */
export interface HistogramRootProps extends PrimitiveProps {
  /**
   * Bin counts. A single `number[]` is interpreted as the channel named by
   * `channel`; a record carries any subset of `'r'`/`'g'`/`'b'`/`'l'`.
   * @default []
   */
  data?: HistogramData;
  /**
   * Primary channel. `'rgb'` is the composite (all three primaries overlaid);
   * the others are single channels. `HistogramBars` defaults to this channel.
   * @default 'l'
   */
  channel?: HistogramChannel;
  /** Requested bin count (the rendered bar count follows the supplied data). @default 256 */
  bins?: number;
  /** Bar-height mapping. @default 'linear' */
  scaleType?: HistogramScaleType;
  /** Disable / dim the histogram (purely presentational — it has no interaction). @default false */
  disabled?: boolean;
  /**
   * Use `role="group"` instead of the default `role="img"`. Reach for it when
   * the bars are themselves interactive descendants. @default false
   */
  group?: boolean;
}
</script>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { Primitive } from '../../internal/primitive';
import { provideHistogramContext } from './context';
import { getChannelBins, histogramMax, isSingleChannelData, projectBars } from './utils';
import { useForwardExpose } from '@robonen/vue';

const {
  data = [],
  channel = 'l',
  bins = 256,
  scaleType = 'linear',
  disabled = false,
  group = false,
  as = 'div',
} = defineProps<HistogramRootProps>();

// A single concrete channel to resolve the `number[]` form against and to drive
// the "has data" summary. `'rgb'` falls back to `'l'` for the array form but the
// summary still inspects whichever primaries are present (see `hasData`).
const primaryChannel = computed<HistogramBarChannel>(() => (channel === 'rgb' ? 'l' : channel));

/** Concrete channels to consider for the "has data" check. */
const summaryChannels = computed<HistogramBarChannel[]>(() => {
  if (channel === 'rgb') return ['r', 'g', 'b'];
  return [primaryChannel.value];
});

const hasData = computed<boolean>(() => {
  for (const ch of summaryChannels.value) {
    const binsForChannel = getChannelBins(data, ch, primaryChannel.value);
    if (histogramMax(binsForChannel) > 0) return true;
  }
  // The single-array form keyed under a different channel still counts as data
  // if it carries any signal (e.g. `channel: 'r'` with a bare array).
  if (isSingleChannelData(data) && data.length > 0 && histogramMax(data) > 0) return true;
  return false;
});

/**
 * Normalised heights for `ch`. Each channel is normalised against ITS OWN peak
 * so a quiet channel still fills the box — the standard per-channel histogram
 * behaviour. The `projectBars` peak guard makes an empty/all-zero channel
 * project to all zeros.
 */
function bars(ch: HistogramBarChannel): number[] {
  const binsForChannel = getChannelBins(data, ch, primaryChannel.value);
  return projectBars(binsForChannel, scaleType);
}

const ariaLabel = computed<string>(() => {
  const channelName = channel === 'rgb' ? 'RGB' : channel.toUpperCase();
  if (!hasData.value) return `Histogram, ${channelName}, no data`;
  return `Histogram, ${channelName}`;
});

provideHistogramContext({
  data: toRef(() => data),
  channel: toRef(() => channel),
  scaleType: toRef(() => scaleType),
  bins: toRef(() => bins),
  disabled: toRef(() => disabled),
  hasData,
  bars,
});

defineExpose({ hasData, bars });

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :role="group ? 'group' : 'img'"
    :aria-label="ariaLabel"
    :data-channel="channel"
    :data-scale="scaleType"
    :data-empty="hasData ? undefined : ''"
    :data-disabled="disabled ? '' : undefined"
  >
    <slot :bars="bars" :has-data="hasData" />
  </Primitive>
</template>
