<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { Tick } from '../../internal/scale';

/**
 * A single gridline of the ruler. Consumers usually render their own tick layer
 * by looping the `ticks` exposed on `TimeRulerRoot`'s default slot, but this
 * part provides a ready-made, positioned element for the common case.
 *
 * It is `aria-hidden` by default (the screen-reader summary announces the window
 * instead of every tick), reflects `tick.major` on `data-major`, and positions
 * itself at `tick.px` via an inline `left` (overridable through merged styles).
 */
export interface TimeRulerTickProps extends PrimitiveProps {
  /** The tick to render (from `TimeRulerRoot`'s exposed `ticks`). */
  tick: Tick;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';

const { tick, as = 'div' } = defineProps<TimeRulerTickProps>();

const { forwardRef } = useForwardExpose();

const style = computed(() => ({
  position: 'absolute' as const,
  left: `${tick.px}px`,
}));
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
    :data-major="tick.major ? '' : undefined"
    :data-value="tick.value"
    :style="style"
  >
    <slot :tick="tick" />
  </Primitive>
</template>
