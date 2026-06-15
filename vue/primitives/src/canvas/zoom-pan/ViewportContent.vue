<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The single transformed layer. Everything a consumer renders inside the
 * viewport lives here, so pan/zoom is one GPU-composited `transform` rather than
 * a per-element restyle. `transform-origin: 0 0` is required — the coordinate
 * formulas in `utils.ts` assume top-left scaling. `will-change: transform` is
 * toggled on ONLY while interacting (never permanently): a pinned hint locks the
 * compositor's raster scale, so the cached texture is GPU-upscaled and the
 * content blurs at high zoom — toggling it lets the layer re-rasterise crisply
 * once motion settles (see `useInteractionState`). Pure presentational; renders
 * the default slot.
 */
export interface ViewportContentProps extends PrimitiveProps {}

/**
 * Static style shared by every transformed layer. Frozen and hoisted to module
 * scope so the per-frame re-render only allocates/diffs the dynamic
 * `transform`/`willChange` keys (see `dynamicStyle`), never these three.
 */
const BASE_STYLE = Object.freeze({
  position: 'absolute',
  inset: '0',
  transformOrigin: '0 0',
});
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useViewportContext } from './context';

const { as = 'div' } = defineProps<ViewportContentProps>();

const ctx = useViewportContext();
const { forwardRef } = useForwardExpose();

const dynamicStyle = computed(() => {
  const vp = ctx.viewport.value;
  return {
    transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
    willChange: ctx.isInteracting.value ? 'transform' : undefined,
  };
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    data-viewport-content=""
    :style="[BASE_STYLE, dynamicStyle]"
  >
    <slot />
  </Primitive>
</template>
