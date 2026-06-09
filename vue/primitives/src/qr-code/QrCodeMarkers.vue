<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { QrMarkerBall, QrMarkerFrame } from './utils';

/**
 * Convenience wrapper that renders all three finder patterns with a shared
 * style. Forwards `frame`/`ball`/`radius` to each `QrCodeMarker` and re-exposes
 * their `#frame` / `#ball` slots (augmented with the `corner` being drawn). For
 * fully bespoke per-corner rendering, use the `#default` slot — it is invoked
 * once per marker with its placement.
 */
export interface QrCodeMarkersProps extends PrimitiveProps {
  /** Outer ring shape for every marker. Default `square`. */
  frame?: QrMarkerFrame;
  /** Inner ball shape for every marker. Default `square`. */
  ball?: QrMarkerBall;
  /** Roundness in `[0, 1]` for `rounded` frames/balls. Default `0.5`. */
  radius?: number;
}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import QrCodeMarker from './QrCodeMarker.vue';
import { useQrCodeContext } from './context';

const { as = 'g', frame = 'square', ball = 'square', radius = 0.5 } = defineProps<QrCodeMarkersProps>();

const { forwardRef } = useForwardExpose();
const ctx = useQrCodeContext();
</script>

<template>
  <Primitive :ref="forwardRef" :as="as" data-qr-markers>
    <template v-for="marker in ctx.markers.value" :key="marker.corner">
      <slot
        v-if="$slots.default"
        :corner="marker.corner"
        :x="marker.x"
        :y="marker.y"
        :cx="marker.x + 3.5"
        :cy="marker.y + 3.5"
      />
      <QrCodeMarker
        v-else
        :corner="marker.corner"
        :frame="frame"
        :ball="ball"
        :radius="radius"
      >
        <template v-if="$slots.frame" #frame="scope">
          <slot name="frame" v-bind="scope" :corner="marker.corner" />
        </template>
        <template v-if="$slots.ball" #ball="scope">
          <slot name="ball" v-bind="scope" :corner="marker.corner" />
        </template>
      </QrCodeMarker>
    </template>
  </Primitive>
</template>
