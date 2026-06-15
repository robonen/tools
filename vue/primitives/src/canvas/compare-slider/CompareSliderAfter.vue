<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The revealed ("after") layer, drawn on top of `CompareSliderBefore` and
 * clipped via `clip-path: inset(...)` so that exactly `position`% of it is
 * shown. The clip side is driven by the root's combined `flip` flag (so the
 * revealed region always sits on the same side as the divider). At `0` / `100`
 * the layer is fully hidden / shown with no sub-pixel sliver. Rendered inside
 * `CompareSliderRoot` and absolutely positioned to fill it (`inset: 0`); put the
 * comparison image / view here.
 */
export interface CompareSliderAfterProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useCompareSliderContext } from './context';
import { clamp } from '@robonen/stdlib';

const { as = 'div' } = defineProps<CompareSliderAfterProps>();
const ctx = useCompareSliderContext();
const { forwardRef } = useForwardExpose();

// `clip-path: inset(top right bottom left)`. Reveal exactly `position`% measured
// from the start edge; the OTHER edge is clipped by `100 - position`%. The
// `flip` flag selects which edge is the start, matching the divider side. Clamp
// to [0, 100] so 0/100 hide/show fully with no 0.5px sliver.
const clipPath = computed<string>(() => {
  const p = clamp(ctx.position.value, 0, 100);
  const hidden = 100 - p;
  const horizontal = ctx.orientation.value === 'horizontal';
  const flip = ctx.flip.value;
  if (horizontal) {
    // No flip → reveal the left portion (clip the right edge).
    // Flip → reveal the right portion (clip the left edge).
    return flip
      ? `inset(0% 0% 0% ${hidden}%)`
      : `inset(0% ${hidden}% 0% 0%)`;
  }
  // No flip → reveal the top portion (clip the bottom edge).
  // Flip → reveal the bottom portion (clip the top edge).
  return flip
    ? `inset(${hidden}% 0% 0% 0%)`
    : `inset(0% 0% ${hidden}% 0%)`;
});

// Stable shape: same keys in the same order for a monomorphic style object.
const style = computed<{
  position: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
  clipPath: string;
}>(() => ({
  position: 'absolute',
  top: '0',
  right: '0',
  bottom: '0',
  left: '0',
  clipPath: clipPath.value,
}));
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :style="style"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
  >
    <slot :position="ctx.position.value" />
  </Primitive>
</template>
