<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

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
import { Primitive } from '../../internal/primitive';
import { computed, onBeforeUnmount, ref, useAttrs, watch } from 'vue';
import { useElementSize, useForwardExpose } from '@robonen/vue';
import { useSliderContext } from './context';
import { getDefaultThumbLabel, getThumbInBoundsOffset } from './utils';

const { as = 'span' } = defineProps<SliderThumbProps>();
const ctx = useSliderContext();
const attrs = useAttrs();

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

// Measure the thumb only matters for `thumbAlignment: 'contain'`; for the
// default `'overflow'` path the size is never read, so it adds no reactivity.
const { width, height } = useElementSize(currentElement);

// In-bounds inset (px) so the thumb stays fully within the track at the
// extremes. `0` for `'overflow'` (the default) — same positioning as before.
const inBoundsOffset = computed(() => {
  if (ctx.thumbAlignment.value !== 'contain') return 0;
  const horizontal = ctx.orientation.value === 'horizontal';
  const size = horizontal ? width.value : height.value;
  if (size === 0) return 0;
  const rtl = ctx.direction.value === 'rtl';
  const inverted = ctx.inverted.value;
  // `direction` mirrors the positioning edge: +1 when the start edge sits at
  // the low end, -1 when flipped (rtl/inverted in horizontal, inverted in
  // vertical).
  const flip = horizontal ? rtl !== inverted : inverted;
  const direction = flip ? -1 : 1;
  return getThumbInBoundsOffset(size, percentage.value, direction);
});

// `left: calc(P% + Opx)` keeps the monomorphic style shape while folding in
// the contain offset (which is `0px` for overflow).
function edge(pct: number, offset: number): string {
  return offset === 0 ? `${pct}%` : `calc(${pct}% + ${offset}px)`;
}

// Stable shape: always return the same keys in the same order so V8 keeps
// one hidden class for this object and the style patcher sees a monomorphic
// input. Unused sides are explicit `undefined`.
const positionStyle = computed<{
  left: string | undefined;
  right: string | undefined;
  top: string | undefined;
  bottom: string | undefined;
}>(() => {
  const pct = percentage.value;
  const offset = inBoundsOffset.value;
  const horizontal = ctx.orientation.value === 'horizontal';
  const rtl = ctx.direction.value === 'rtl';
  const inverted = ctx.inverted.value;
  if (horizontal) {
    const flip = rtl !== inverted;
    return {
      left: flip ? undefined : edge(pct, offset),
      right: flip ? edge(pct, offset) : undefined,
      top: undefined,
      bottom: undefined,
    };
  }
  return {
    left: undefined,
    right: undefined,
    top: inverted ? edge(pct, offset) : undefined,
    bottom: inverted ? undefined : edge(pct, offset),
  };
});

// Fall back to a generated label (`Minimum`/`Maximum`/`Value N of M`) only when
// the consumer has not supplied an explicit `aria-label`/`aria-labelledby`.
const accessibleLabel = computed<string | undefined>(() => {
  const hasLabel = attrs['aria-label'] !== undefined && attrs['aria-label'] !== null;
  const hasLabelledBy = attrs['aria-labelledby'] !== undefined && attrs['aria-labelledby'] !== null;
  if (hasLabel || hasLabelledBy) return undefined;
  return getDefaultThumbLabel(index.value, ctx.values.value.length);
});

// Humanised `aria-valuetext` from the optional formatter; the consumer can
// still override by passing their own `aria-valuetext` (it wins via `$attrs`).
const valueText = computed<string | undefined>(() => {
  if (attrs['aria-valuetext'] !== undefined && attrs['aria-valuetext'] !== null) return undefined;
  const fmt = ctx.valueText.value;
  return fmt ? fmt(value.value, index.value) : undefined;
});

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value || index.value === -1) return;
  const horizontal = ctx.orientation.value === 'horizontal';
  const rtl = ctx.direction.value === 'rtl';
  const step = ctx.step.value;
  // Shift+Arrow jumps by the same large step as Page Up/Down.
  const big = step * ctx.largeStepMultiplier.value;
  const current = ctx.values.value[index.value] ?? ctx.min.value;
  const unit = event.shiftKey ? big : step;
  let delta: number;
  switch (event.key) {
    case 'ArrowRight':
      delta = horizontal ? (rtl ? -unit : unit) : 0;
      break;
    case 'ArrowLeft':
      delta = horizontal ? (rtl ? unit : -unit) : 0;
      break;
    case 'ArrowUp':
      delta = horizontal ? 0 : unit;
      break;
    case 'ArrowDown':
      delta = horizontal ? 0 : -unit;
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
    :aria-label="accessibleLabel"
    :aria-valuemin="ctx.min.value"
    :aria-valuemax="ctx.max.value"
    :aria-valuenow="value"
    :aria-valuetext="valueText"
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
