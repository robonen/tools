<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { Tick } from '../../internal/scale';

/**
 * The text label for a tick (`tick.label`). Rendered for `major` ticks in the
 * default tickers; `aria-hidden` so the visual labels do not duplicate the
 * screen-reader summary. Positioned at `tick.px` like `TimeRulerTick`; the
 * default slot falls back to `tick.label` so it works without a slot.
 */
export interface TimeRulerLabelProps extends PrimitiveProps {
  /** The tick whose label to render. */
  tick: Tick;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';

const { tick, as = 'span' } = defineProps<TimeRulerLabelProps>();

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
    :data-value="tick.value"
    :style="style"
  >
    <slot :tick="tick">{{ tick.label }}</slot>
  </Primitive>
</template>
