<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The dimmed scrim over the media OUTSIDE the crop rectangle. Renders four
 * absolutely-positioned rects (top / bottom / left / right of the selection) so
 * the consumer can tint the excluded region with a single `background`.
 * Presentational (`aria-hidden`, `pointer-events: none`). Place it as a sibling
 * of `CropArea`, spanning the media surface. Hidden while the selection is empty.
 * The four rects are exposed via the default slot for full styling control.
 */
export interface CropOverlayProps extends PrimitiveProps {}

/** One scrim rect exposed via the default slot: a stable-shape inline style. */
export interface ScrimRect {
  key: string;
  style: {
    position: string;
    left: string | undefined;
    right: string | undefined;
    top: string | undefined;
    bottom: string | undefined;
    width: string | undefined;
    height: string | undefined;
  };
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useCropContext } from './context';

const { as = 'div' } = defineProps<CropOverlayProps>();

const ctx = useCropContext();
const { forwardRef } = useForwardExpose();

// The crop rect as fractions of the media (0..1) regardless of `units`, with the
// x axis mirrored under RTL so the scrim lines up with the visual selection.
const frac = computed(() => {
  const r = ctx.rect.value;
  if (r === null) return null;
  const denomW = ctx.units.value === 'normalized' ? 1 : Math.max(ctx.mediaPixels.value.width, 1e-9);
  const denomH = ctx.units.value === 'normalized' ? 1 : Math.max(ctx.mediaPixels.value.height, 1e-9);
  let left = r.x / denomW;
  if (ctx.direction.value === 'rtl') left = (denomW - r.x - r.width) / denomW;
  return {
    left: left * 100,
    top: (r.y / denomH) * 100,
    width: (r.width / denomW) * 100,
    height: (r.height / denomH) * 100,
  };
});

// The four scrim rects (top, bottom, left, right of the selection). Every rect
// emits the same key set (unused sides explicit `undefined`) so the style type
// stays monomorphic.
const rects = computed<ScrimRect[]>(() => {
  const f = frac.value;
  if (f === null) return [];
  const right = f.left + f.width;
  const bottom = f.top + f.height;
  return [
    { key: 'top', style: { position: 'absolute', left: '0', right: '0', top: '0', bottom: undefined, width: undefined, height: `${f.top}%` } },
    { key: 'bottom', style: { position: 'absolute', left: '0', right: '0', top: `${bottom}%`, bottom: '0', width: undefined, height: undefined } },
    { key: 'left', style: { position: 'absolute', left: '0', right: undefined, top: `${f.top}%`, bottom: undefined, width: `${f.left}%`, height: `${f.height}%` } },
    { key: 'right', style: { position: 'absolute', left: `${right}%`, right: '0', top: `${f.top}%`, bottom: undefined, width: undefined, height: `${f.height}%` } },
  ];
});
</script>

<template>
  <Primitive
    v-if="frac !== null"
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
    data-crop-overlay=""
    :style="{ position: 'absolute', inset: '0', pointerEvents: 'none' }"
  >
    <slot :rects="rects">
      <Primitive v-for="rect in rects" :key="rect.key" as="span" :data-side="rect.key" :style="rect.style" />
    </slot>
  </Primitive>
</template>
