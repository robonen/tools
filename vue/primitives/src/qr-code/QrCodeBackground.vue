<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A rectangle covering the entire code, quiet zone included. Use it for a solid
 * backdrop or a gradient/pattern fill behind the modules. Defaults to
 * `fill="none"` so the page background shows through unless you style it.
 */
export interface QrCodeBackgroundProps extends PrimitiveProps {
  /** Fill applied to the rectangle. Default `'none'` (transparent). Overridable via CSS. */
  fill?: string;
  /** Corner radius in module units. Default `0`. */
  radius?: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useQrCodeContext } from './context';

const { as = 'rect', fill = 'none', radius = 0 } = defineProps<QrCodeBackgroundProps>();

const { forwardRef } = useForwardExpose();
const ctx = useQrCodeContext();

const rect = computed(() => {
  const m = ctx.margin.value;
  return {
    x: -m.left,
    y: -m.top,
    width: m.left + ctx.size.value + m.right,
    height: m.top + ctx.size.value + m.bottom,
  };
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :x="rect.x"
    :y="rect.y"
    :width="rect.width"
    :height="rect.height"
    :rx="radius || undefined"
    :ry="radius || undefined"
    :fill="fill"
    data-qr-background
  />
</template>
