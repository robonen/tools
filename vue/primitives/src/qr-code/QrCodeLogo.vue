<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Overlays a logo at the center of the code (or anywhere via `x`/`y`). Pass an
 * image `src`, or use the default slot for arbitrary SVG content — the slot
 * receives the computed placement so you can size and position freely.
 *
 * With `knockout` (the default) the modules behind the logo are cleared so it
 * sits in clean space; pair it with a high `errorCorrection` level on the root
 * to keep the code scannable.
 */
export interface QrCodeLogoProps extends PrimitiveProps {
  /** Image URL to render via an SVG `<image>`. Optional when using the default slot. */
  src?: string;
  /** Logo extent as a fraction of the code size, in `[0, 1]`. Default `0.25`. */
  size?: number;
  /** Center X in module units. Defaults to the code's horizontal center. */
  x?: number;
  /** Center Y in module units. Defaults to the code's vertical center. */
  y?: number;
  /** Extra cleared padding around the logo, in modules. Default `1`. */
  padding?: number;
  /** Clear the modules behind the logo so it has clean space. Default `true`. */
  knockout?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, watchEffect } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useQrCodeContext } from './context';

const {
  as = 'g',
  src,
  size = 0.25,
  x,
  y,
  padding = 1,
  knockout = true,
} = defineProps<QrCodeLogoProps>();

const { forwardRef } = useForwardExpose();
const ctx = useQrCodeContext();

const area = computed(() => {
  const extent = Math.max(0, size) * ctx.size.value;
  const cx = x ?? ctx.size.value / 2;
  const cy = y ?? ctx.size.value / 2;
  return {
    x: cx - extent / 2,
    y: cy - extent / 2,
    width: extent,
    height: extent,
    cx,
    cy,
  };
});

const owner = Symbol('qr-logo');

watchEffect(() => {
  if (!knockout) {
    ctx.release(owner);
    return;
  }
  const a = area.value;
  ctx.reserve(owner, {
    x: a.x - padding,
    y: a.y - padding,
    width: a.width + padding * 2,
    height: a.height + padding * 2,
  });
});

onScopeDispose(() => ctx.release(owner));
</script>

<template>
  <Primitive :ref="forwardRef" :as="as" data-qr-logo>
    <image
      v-if="src"
      :href="src"
      :x="area.x"
      :y="area.y"
      :width="area.width"
      :height="area.height"
      preserveAspectRatio="xMidYMid meet"
    />
    <slot v-bind="area" />
  </Primitive>
</template>
