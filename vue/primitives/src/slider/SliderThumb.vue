<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A draggable handle rendered as `role="slider"`, one per value, placed inside
 * `SliderTrack`. It registers with the root to claim its index, positions itself
 * along the track by its value's percentage, and handles keyboard interaction
 * (arrow keys step by `step`, Page Up/Down by a larger step, Home/End jump to
 * the bounds) with full ARIA value attributes. Render one thumb for a single
 * value or several for a range; give each an `aria-label`. Exposes `value` and
 * `percent` as slot props.
 */
export interface SliderThumbProps extends PrimitiveProps {
  // `aria-label` (and other ARIA attributes) are intentionally NOT declared as
  // props so they fall through to the rendered `role="slider"` element — give
  // each thumb an `aria-label` for its accessible name.
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useSliderContext } from './context';

const { as = 'span' } = defineProps<SliderThumbProps>();
const ctx = useSliderContext();

const { forwardRef, currentElement } = useForwardExpose();
const index = ref(-1);

watch(currentElement, (node) => {
  if (node) index.value = ctx.registerThumb(node);
  else index.value = -1;
});

onBeforeUnmount(() => {
  if (currentElement.value) ctx.unregisterThumb(currentElement.value);
});

const value = computed(() => ctx.values.value[index.value] ?? ctx.min.value);

const percentage = computed(() => {
  const min = ctx.min.value;
  const range = ctx.max.value - min;
  if (range === 0) return 0;
  return ((value.value - min) / range) * 100;
});

// Stable shape: always return the same keys in the same order so V8 keeps
// one hidden class for this object and the style patcher sees a monomorphic
// input. Unused sides are explicit `undefined`.
const positionStyle = computed<{
  left: string | undefined;
  right: string | undefined;
  top: string | undefined;
  bottom: string | undefined;
}>(() => {
  const pct = `${percentage.value}%`;
  const horizontal = ctx.orientation.value === 'horizontal';
  const rtl = ctx.direction.value === 'rtl';
  const inverted = ctx.inverted.value;
  if (horizontal) {
    const flip = rtl !== inverted;
    return {
      left: flip ? undefined : pct,
      right: flip ? pct : undefined,
      top: undefined,
      bottom: undefined,
    };
  }
  return {
    left: undefined,
    right: undefined,
    top: inverted ? pct : undefined,
    bottom: inverted ? undefined : pct,
  };
});

function largeStep(): number {
  const step = ctx.step.value;
  return Math.max(step * 10, step);
}

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value || index.value === -1) return;
  const horizontal = ctx.orientation.value === 'horizontal';
  const rtl = ctx.direction.value === 'rtl';
  const step = ctx.step.value;
  const big = largeStep();
  const current = ctx.values.value[index.value] ?? ctx.min.value;
  let delta: number;
  switch (event.key) {
    case 'ArrowRight':
      delta = horizontal ? (rtl ? -step : step) : 0;
      break;
    case 'ArrowLeft':
      delta = horizontal ? (rtl ? step : -step) : 0;
      break;
    case 'ArrowUp':
      delta = horizontal ? 0 : step;
      break;
    case 'ArrowDown':
      delta = horizontal ? 0 : -step;
      break;
    case 'PageUp':
      delta = big;
      break;
    case 'PageDown':
      delta = -big;
      break;
    case 'Home':
      event.preventDefault();
      ctx.updateValue(index.value, ctx.min.value);
      return;
    case 'End':
      event.preventDefault();
      ctx.updateValue(index.value, ctx.max.value);
      return;
    default:
      return;
  }
  if (delta === 0) return;
  event.preventDefault();
  ctx.updateValue(index.value, current + delta);
}
</script>

<template>
  <Primitive
    :as="as"
    :ref="forwardRef"
    role="slider"
    :tabindex="ctx.disabled.value ? -1 : 0"
    :aria-valuemin="ctx.min.value"
    :aria-valuemax="ctx.max.value"
    :aria-valuenow="value"
    :aria-orientation="ctx.orientation.value"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
    :style="positionStyle"
    @keydown="onKeyDown"
  >
    <slot :value="value" :percent="percentage" />
  </Primitive>
</template>
