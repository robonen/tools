<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The single transformed layer. Every node and the edge `<svg>` live inside it,
 * so pan/zoom is one GPU-composited `transform` rather than a per-element
 * restyle. `transform-origin:0 0` is required — the coordinate formulas assume
 * top-left scaling. `will-change:transform` is toggled on ONLY while interacting
 * (never permanently): a pinned hint locks the compositor's raster scale, so the
 * cached texture is GPU-upscaled and the graph blurs at high zoom — toggling it
 * lets the layer re-rasterise crisply once motion settles (see
 * `useInteractionState`). Mirrors `FlowNode`'s per-node drag toggle.
 */
export interface FlowViewportProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useFlowContext } from './context';

const { as = 'div' } = defineProps<FlowViewportProps>();

const ctx = useFlowContext();
const { forwardRef } = useForwardExpose();

const transform = computed(() => {
  const vp = ctx.viewport.value;
  return `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`;
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    data-flow-viewport=""
    :style="{
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      transformOrigin: '0 0',
      transform,
      willChange: ctx.isInteracting.value ? 'transform' : undefined,
    }"
  >
    <slot />
  </Primitive>
</template>
