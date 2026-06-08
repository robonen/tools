<script lang="ts">
import type { PrimitiveProps } from '../primitive';
export interface SliderRangeProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useSliderContext } from './context';

const { as = 'span' } = defineProps<SliderRangeProps>();
const { forwardRef } = useForwardExpose();
const ctx = useSliderContext();

// Single-pass min/max over values normalized to percent; no spread, no `.map`.
const percentages = computed<[number, number]>(() => {
  const values = ctx.values.value;
  const min = ctx.min.value;
  const range = ctx.max.value - min;
  if (range === 0 || values.length === 0) return [0, 0];
  const first = ((values[0]! - min) / range) * 100;
  if (values.length === 1) return [0, first];
  let lo = first;
  let hi = first;
  for (let i = 1; i < values.length; i++) {
    const p = ((values[i]! - min) / range) * 100;
    if (p < lo) lo = p;
    else if (p > hi) hi = p;
  }
  return [lo, hi];
});

// Stable shape: always the same keys in the same order. Unused sides explicitly
// `undefined` so V8 (and Vue's style patcher) sees a monomorphic object.
const style = computed<{
  left: string | undefined;
  right: string | undefined;
  top: string | undefined;
  bottom: string | undefined;
}>(() => {
  const [start, end] = percentages.value;
  const startPct = `${start}%`;
  const endPct = `${100 - end}%`;
  const horizontal = ctx.orientation.value === 'horizontal';
  if (horizontal) {
    const flip = (ctx.direction.value === 'rtl') !== ctx.inverted.value;
    return {
      left: flip ? endPct : startPct,
      right: flip ? startPct : endPct,
      top: undefined,
      bottom: undefined,
    };
  }
  const flip = ctx.inverted.value;
  return {
    left: undefined,
    right: undefined,
    top: flip ? startPct : endPct,
    bottom: flip ? endPct : startPct,
  };
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :style="style"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
  >
    <slot />
  </Primitive>
</template>
