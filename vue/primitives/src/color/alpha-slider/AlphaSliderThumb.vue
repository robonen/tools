<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The draggable handle of an `AlphaSliderRoot`, rendered as `role="slider"`
 * with full ARIA value attributes (`aria-valuemin="0"`, `aria-valuemax="1"`,
 * `aria-valuenow` = current alpha, `aria-valuetext` = the alpha as a percent).
 * It positions itself along the track by the alpha percentage and handles
 * keyboard interaction (arrows step by `step`, Page Up/Down and Shift+Arrow by
 * the large step, Home/End jump to `0`/`1`). Give it an `aria-label` or rely on
 * the default `"Alpha"`. Exposes `alpha` and `percent` as slot props.
 */
export interface AlphaSliderThumbProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useAlphaSliderContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'span' } = defineProps<AlphaSliderThumbProps>();
const ctx = useAlphaSliderContext();
const attrs = useAttrs();

const alpha = computed(() => ctx.alpha.value);
const percent = computed(() => alpha.value * 100);

const accessibleLabel = computed<string | undefined>(() => {
  const hasLabel = attrs['aria-label'] !== undefined && attrs['aria-label'] !== null;
  const hasLabelledBy = attrs['aria-labelledby'] !== undefined && attrs['aria-labelledby'] !== null;
  if (hasLabel || hasLabelledBy) return undefined;
  return ctx.labelId.value ? undefined : 'Alpha';
});

const valueText = computed(() => `${Math.round(alpha.value * 100)}%`);

const positionStyle = computed<{
  left: string | undefined;
  right: string | undefined;
  top: string | undefined;
  bottom: string | undefined;
}>(() => {
  const pct = percent.value;
  const horizontal = ctx.orientation.value === 'horizontal';
  const rtl = ctx.direction.value === 'rtl';
  if (horizontal) {
    return {
      left: rtl ? undefined : `${pct}%`,
      right: rtl ? `${pct}%` : undefined,
      top: undefined,
      bottom: undefined,
    };
  }
  return { left: undefined, right: undefined, top: undefined, bottom: `${pct}%` };
});

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const horizontal = ctx.orientation.value === 'horizontal';
  const rtl = ctx.direction.value === 'rtl';
  const step = ctx.step.value;
  const big = step * ctx.largeStep.value;
  const unit = event.shiftKey ? big : step;
  const current = ctx.alpha.value;
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
      ctx.setAlpha(0);
      return;
    case 'End':
      event.preventDefault();
      ctx.setAlpha(1);
      return;
    default:
      return;
  }
  if (delta === 0) return;
  event.preventDefault();
  ctx.setAlpha(current + delta);
}

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="slider"
    :tabindex="ctx.disabled.value ? -1 : 0"
    :aria-label="accessibleLabel"
    :aria-labelledby="!accessibleLabel ? ctx.labelId.value : undefined"
    :aria-valuemin="0"
    :aria-valuemax="1"
    :aria-valuenow="alpha"
    :aria-valuetext="valueText"
    :aria-orientation="ctx.orientation.value"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
    :style="positionStyle"
    @keydown="onKeyDown"
  >
    <slot :alpha="alpha" :percent="percent" />
  </Primitive>
</template>
