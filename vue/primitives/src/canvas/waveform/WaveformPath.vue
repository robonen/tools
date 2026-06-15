<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Alternative SVG rendering of the waveform: a single smoothed `<path>` through
 * the resampled peaks (mirrored top/bottom for a filled silhouette). Smoothing
 * is Catmull-Rom (`buildSmoothPath`) at the supplied `tension`. Purely
 * presentational (`aria-hidden`). Render this OR `WaveformBars`, per the root's
 * `mode`. The `<svg>` stretches to the part's box; size it via CSS.
 */
export interface WaveformPathProps extends PrimitiveProps {
  /**
   * Number of points sampled across the body. Higher is smoother but costlier.
   * @default 256
   */
  samples?: number;
  /**
   * Catmull-Rom tension forwarded to `buildSmoothPath` (`0` = uniform). Higher
   * flattens the curve. @default 0
   */
  tension?: number;
  /** Fill the area under the silhouette (mirrored) instead of stroking a line. @default true */
  filled?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useElementSize, useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { buildSmoothPath } from '../../internal/spline';
import { useWaveformContext } from './context';
import { buildPathPoints } from './utils';

const { as = 'svg', samples = 256, tension = 0, filled = true } = defineProps<WaveformPathProps>();
const ctx = useWaveformContext();

const { forwardRef, currentElement } = useForwardExpose();
const { width, height } = useElementSize(currentElement);

const d = computed(() => {
  const w = width.value;
  const h = height.value;
  if (w <= 0 || h <= 0 || ctx.isEmpty.value) return '';
  const [ws, we] = ctx.window.value;
  const dur = ctx.duration.value;
  const len = ctx.peaks.value.length;
  const sampleStart = dur > 0 ? Math.floor((ws / dur) * len) : 0;
  const sampleEnd = dur > 0 ? Math.ceil((we / dur) * len) : len;
  const top = buildPathPoints(ctx.peaks.value, w, h, samples, ctx.signed.value, sampleStart, sampleEnd);
  if (top.length === 0) return '';
  if (!filled) return buildSmoothPath(top, tension);
  // Filled: top silhouette, then back along the mirrored bottom, closed. Build
  // each smoothed segment from points, then stitch (drop the trailing `M` of the
  // lower segment so it continues the same subpath) and close.
  const mid = h / 2;
  const bottom = top.map(p => ({ x: p.x, y: mid + (mid - p.y) })).reverse();
  const upper = buildSmoothPath(top, tension);
  const lowerFull = buildSmoothPath(bottom, tension);
  // `buildSmoothPath` always starts with `M x,y` — replace it with a line-to so
  // the bottom continues the upper subpath instead of starting a new one.
  const lower = lowerFull.replace(/^M\s*([-\d.]+),([-\d.]+)/, 'L $1,$2');
  return `${upper} ${lower} Z`;
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
    data-waveform-path=""
    preserveAspectRatio="none"
    style="display: block;"
  >
    <slot :d="d">
      <path :d="d" />
    </slot>
  </Primitive>
</template>
