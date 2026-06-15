<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A thin presentational line marking the split between the before and after
 * layers, positioned at the current reveal position. It is purely decorative
 * (no role, no keyboard) — the focusable, screen-reader-accessible target is
 * `CompareSliderHandle`.
 *
 * The recommended two-element pattern is a thin `CompareSliderDivider` line for
 * the visible seam plus a larger `CompareSliderHandle` "puck" for the grab /
 * focus target sitting on top of it (give the handle a wider hit-area via CSS).
 * Render the divider as a sibling or wrapper of the handle inside the root.
 */
export interface CompareSliderDividerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useCompareSliderContext } from './context';

const { as = 'span' } = defineProps<CompareSliderDividerProps>();
const ctx = useCompareSliderContext();
const { forwardRef } = useForwardExpose();

// Sit on the divider. Stable shape: same keys in the same order; the `flip` flag
// selects the positioning edge so the line tracks the after-layer clip side.
const style = computed<{
  position: string;
  left: string | undefined;
  right: string | undefined;
  top: string | undefined;
  bottom: string | undefined;
}>(() => {
  const pct = `${ctx.position.value}%`;
  const horizontal = ctx.orientation.value === 'horizontal';
  const flip = ctx.flip.value;
  if (horizontal) {
    return {
      position: 'absolute',
      left: flip ? undefined : pct,
      right: flip ? pct : undefined,
      top: undefined,
      bottom: undefined,
    };
  }
  return {
    position: 'absolute',
    left: undefined,
    right: undefined,
    top: flip ? undefined : pct,
    bottom: flip ? pct : undefined,
  };
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
    :style="style"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
  >
    <slot :position="ctx.position.value" />
  </Primitive>
</template>
