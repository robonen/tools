<script lang="ts">
import type { HistogramBarChannel } from './utils';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Renders the per-channel bars of the enclosing `HistogramRoot` as a dense,
 * `aria-hidden` visual. Supply a single `channel` to draw one channel, or omit
 * it to draw every primary the root's `channel` requests (the three primaries
 * for `'rgb'`, otherwise the single resolved channel). Each rendered bar group
 * carries `data-channel` and a `--histogram-color` hint; bar heights come from
 * the root's projection (already normalised to `[0, 1]` with the all-zero
 * guard, so they are `0` — never `NaN` — for an empty histogram). The default
 * slot receives the per-bar `{ channel, heights }` so consumers own the paint.
 */
export interface HistogramBarsProps extends PrimitiveProps {
  /** Draw a single channel. Omit to draw every channel the root requests. */
  channel?: HistogramBarChannel;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useHistogramContext } from './context';
import { HISTOGRAM_CHANNEL_COLORS } from './utils';
import { useForwardExpose } from '@robonen/vue';

const { channel, as = 'div' } = defineProps<HistogramBarsProps>();
const ctx = useHistogramContext();

/** Channels this part draws: the explicit `channel`, else whatever the root asks for. */
const channels = computed<HistogramBarChannel[]>(() => {
  if (channel) return [channel];
  const rootChannel = ctx.channel.value;
  // `'rgb'` expands to the three primaries; any other value is already a single
  // concrete channel.
  return rootChannel === 'rgb' ? ['r', 'g', 'b'] : [rootChannel];
});

/**
 * Per-channel rows of `{ channel, color, heights }` (heights normalised
 * `[0,1]`). The `varStyle`/`barStyles` fields are precomputed render styling
 * for the built-in fallback paint so the `v-for` binds stable object
 * references instead of allocating a fresh style object per channel/per bar on
 * every render; they are internal and not part of the slot contract.
 */
const series = computed(() =>
  channels.value.map((ch) => {
    const heights = ctx.bars(ch);
    const barStyles: Array<{ height: string }> = [];
    for (let i = 0; i < heights.length; i++) {
      barStyles.push({ height: `${heights[i]! * 100}%` });
    }
    return {
      channel: ch,
      color: HISTOGRAM_CHANNEL_COLORS[ch],
      heights,
      varStyle: { '--histogram-color': HISTOGRAM_CHANNEL_COLORS[ch] },
      barStyles,
    };
  }),
);

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
    :data-disabled="ctx.disabled.value ? '' : undefined"
  >
    <template v-for="row in series" :key="row.channel">
      <slot
        :channel="row.channel"
        :color="row.color"
        :heights="row.heights"
      >
        <Primitive
          as="div"
          :data-channel="row.channel"
          :style="row.varStyle"
        >
          <Primitive
            v-for="(barStyle, i) in row.barStyles"
            :key="i"
            as="div"
            :data-bar="i"
            :style="barStyle"
          />
        </Primitive>
      </slot>
    </template>
  </Primitive>
</template>
