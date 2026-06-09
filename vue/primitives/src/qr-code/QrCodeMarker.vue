<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { MarkerCorner, QrMarkerBall, QrMarkerFrame } from './utils';

/**
 * A single finder ("eye") pattern, made of an outer `frame` ring and an inner
 * `ball`. Position it by `corner` (resolved from the matrix size) or pin it with
 * explicit `x`/`y` module coordinates. Override the `#frame` / `#ball` slots to
 * draw arbitrary shapes; each receives the 7×7 region's origin and center.
 */
export interface QrCodeMarkerProps extends PrimitiveProps {
  /** Which finder to render. Ignored when both `x` and `y` are given. Default `'top-left'`. */
  corner?: MarkerCorner;
  /** Explicit X of the finder's top-left module (overrides `corner`). */
  x?: number;
  /** Explicit Y of the finder's top-left module (overrides `corner`). */
  y?: number;
  /** Outer ring shape: `square` (default), `rounded`, or `circle`. */
  frame?: QrMarkerFrame;
  /** Inner ball shape: `square` (default), `rounded`, `circle`, or `diamond`. */
  ball?: QrMarkerBall;
  /** Roundness in `[0, 1]` for `rounded` frames/balls. Default `0.5`. */
  radius?: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useQrCodeContext } from './context';
import { markerBallPath, markerFramePath } from './utils';

const {
  as = 'g',
  corner = 'top-left',
  x,
  y,
  frame = 'square',
  ball = 'square',
  radius = 0.5,
} = defineProps<QrCodeMarkerProps>();

const { forwardRef } = useForwardExpose();
const ctx = useQrCodeContext();

const placement = computed(() => {
  if (x !== undefined && y !== undefined)
    return { x, y };
  return ctx.markers.value.find(m => m.corner === corner) ?? { x: 0, y: 0 };
});

const origin = computed(() => {
  const p = placement.value;
  return { x: p.x, y: p.y, cx: p.x + 3.5, cy: p.y + 3.5 };
});

const framePath = computed(() => markerFramePath(placement.value.x, placement.value.y, frame, radius));
const ballPath = computed(() => markerBallPath(placement.value.x, placement.value.y, ball, radius));
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-corner="corner"
    data-qr-marker
  >
    <slot name="frame" v-bind="origin">
      <path :d="framePath" fill-rule="evenodd" data-qr-marker-frame />
    </slot>
    <slot name="ball" v-bind="origin">
      <path :d="ballPath" data-qr-marker-ball />
    </slot>
  </Primitive>
</template>
