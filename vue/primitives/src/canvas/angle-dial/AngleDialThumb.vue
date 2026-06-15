<script lang="ts">
import type { AngleDialValueText } from './context';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The draggable handle of an `AngleDialRoot`, rendered as `role="slider"` and
 * positioned on the ring by the current angle. It owns keyboard interaction
 * (Arrow keys step by `step`, Shift+Arrow / Page keys by `largeStep`, Home / End
 * jump to the bounds) and carries the ARIA value attributes.
 *
 * It INTENTIONALLY omits `aria-orientation`: a radial control has no single
 * axis, so claiming `horizontal` / `vertical` would be misleading. Because a
 * bare number is ambiguous on a circle, `aria-valuetext` strongly defaults to
 * `` `${Math.round(deg)}°` `` (override via `valueText`). Give the thumb an
 * `aria-label` (defaults to `'Angle'`). Exposes `value` and `point` (its
 * fractional `{ x, y }` position on a unit circle, with `0.5,0.5` at center) as
 * slot props for positioning.
 */
export interface AngleDialThumbProps extends PrimitiveProps {
  /**
   * Formatter producing a human-friendly `aria-valuetext` from the angle in
   * degrees. Defaults to `` (deg) => `${Math.round(deg)}°` `` — a degree suffix
   * disambiguates the bare number on a circular control. Return `undefined` to
   * omit `aria-valuetext`.
   * @default (deg) => `${Math.round(deg)}°`
   */
  valueText?: AngleDialValueText;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useAngleDialContext } from './context';
import { angleToPoint } from './utils';

// Module-shareable unit-circle center; `angleToPoint` only reads `center.x` /
// `center.y`, so a single frozen const avoids re-allocating the literal on every
// drag-frame recompute of `point`.
const CENTER = Object.freeze({ x: 0.5, y: 0.5 });

const { as = 'span', valueText = (deg: number) => `${Math.round(deg)}°` } = defineProps<AngleDialThumbProps>();
const ctx = useAngleDialContext();
const attrs = useAttrs();

const value = computed(() => ctx.value.value);

// Fractional position on a unit circle for CSS placement: x/y in [0, 1] with the
// center at (0.5, 0.5). Consumers typically render `left: x*100%, top: y*100%`
// on a thumb sized so its center lands on the ring.
const point = computed<{ x: number; y: number }>(() => angleToPoint(value.value, 0.5, CENTER));

const positionStyle = computed<{ left: string; top: string }>(() => ({
  left: `${point.value.x * 100}%`,
  top: `${point.value.y * 100}%`,
}));

// Fall back to 'Angle' only when the consumer has not supplied an explicit
// `aria-label` / `aria-labelledby`.
const accessibleLabel = computed<string | undefined>(() => {
  const hasLabel = attrs['aria-label'] !== undefined && attrs['aria-label'] !== null;
  const hasLabelledBy = attrs['aria-labelledby'] !== undefined && attrs['aria-labelledby'] !== null;
  if (hasLabel || hasLabelledBy) return undefined;
  return 'Angle';
});

// Humanised `aria-valuetext`; a consumer-supplied `aria-valuetext` attr wins
// (it falls through via `$attrs`).
const valueTextAttr = computed<string | undefined>(() => {
  if (attrs['aria-valuetext'] !== undefined && attrs['aria-valuetext'] !== null) return undefined;
  return valueText(value.value);
});

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const step = ctx.step.value;
  const big = ctx.largeStep.value;
  const unit = event.shiftKey ? big : step;
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      event.preventDefault();
      ctx.nudge(unit);
      return;
    case 'ArrowLeft':
    case 'ArrowDown':
      event.preventDefault();
      ctx.nudge(-unit);
      return;
    case 'PageUp':
      event.preventDefault();
      ctx.nudge(big);
      return;
    case 'PageDown':
      event.preventDefault();
      ctx.nudge(-big);
      return;
    case 'Home':
      event.preventDefault();
      ctx.toStart();
      return;
    case 'End':
      event.preventDefault();
      ctx.toEnd();
      break;
    default:
  }
}

const { forwardRef } = useForwardExpose();
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
    :aria-valuetext="valueTextAttr"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :style="positionStyle"
    @keydown="onKeyDown"
  >
    <slot :value="value" :point="point" />
  </Primitive>
</template>
