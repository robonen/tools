<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The 2D handle of a `ColorAreaRoot`. A single thumb carries two axes
 * (saturation on x, brightness on y) which one `aria-valuenow` cannot express,
 * so it is exposed as `role="slider"` with `aria-valuenow` set to the primary
 * axis (brightness) and `aria-valuetext` conveying **both** channels (e.g.
 * `"Saturation 60%, Brightness 80%"`). Keyboard: Left/Right nudge saturation by
 * `step` (direction-aware), Up/Down nudge brightness (Up = brighter),
 * Shift+Arrow uses the large step, Home/End set saturation to `0`/`1`, and Page
 * Up/Down change brightness by the large step. It positions itself at
 * `left = saturation`, `top = 1 − brightness`. Pass `valueText` to override the
 * announced text and `aria-label` for the accessible name (default
 * `"Saturation and brightness"`).
 */
export interface ColorAreaThumbProps extends PrimitiveProps {
  /**
   * Override the `aria-valuetext` describing both axes. Receives saturation and
   * value/brightness as `0–1` floats.
   */
  valueText?: (saturation: number, value: number) => string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useColorAreaContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { valueText, as = 'span' } = defineProps<ColorAreaThumbProps>();
const ctx = useColorAreaContext();
const attrs = useAttrs();

const saturation = computed(() => ctx.saturation.value);
const value = computed(() => ctx.value.value);

// `left = s`, `top = 1 − v` (top of the area is full brightness).
const positionStyle = computed(() => ({
  left: `${saturation.value * 100}%`,
  top: `${(1 - value.value) * 100}%`,
}));

const accessibleLabel = computed<string | undefined>(() => {
  const hasLabel = attrs['aria-label'] !== undefined && attrs['aria-label'] !== null;
  const hasLabelledBy = attrs['aria-labelledby'] !== undefined && attrs['aria-labelledby'] !== null;
  if (hasLabel || hasLabelledBy) return undefined;
  return ctx.labelId.value ? undefined : 'Saturation and brightness';
});

// One thumb, two axes: announce BOTH via aria-valuetext.
const ariaValueText = computed(() => {
  if (attrs['aria-valuetext'] !== undefined && attrs['aria-valuetext'] !== null) return undefined;
  if (valueText) return valueText(saturation.value, value.value);
  return `Saturation ${Math.round(saturation.value * 100)}%, Brightness ${Math.round(value.value * 100)}%`;
});

// `aria-valuenow` carries the primary axis (brightness).
const ariaValueNow = computed(() => Math.round(value.value * 100));

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const rtl = ctx.direction.value === 'rtl';
  const step = ctx.step.value;
  const big = ctx.largeStep.value;
  const unit = event.shiftKey ? big : step;
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      ctx.setSaturation(saturation.value + (rtl ? -unit : unit));
      return;
    case 'ArrowLeft':
      event.preventDefault();
      ctx.setSaturation(saturation.value + (rtl ? unit : -unit));
      return;
    case 'ArrowUp':
      event.preventDefault();
      ctx.setValue(value.value + unit);
      return;
    case 'ArrowDown':
      event.preventDefault();
      ctx.setValue(value.value - unit);
      return;
    case 'Home':
      event.preventDefault();
      ctx.setSaturation(0);
      return;
    case 'End':
      event.preventDefault();
      ctx.setSaturation(1);
      return;
    case 'PageUp':
      event.preventDefault();
      ctx.setValue(value.value + big);
      return;
    case 'PageDown':
      event.preventDefault();
      ctx.setValue(value.value - big);
      break;
    default:
      break;
  }
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
    :aria-valuemax="100"
    :aria-valuenow="ariaValueNow"
    :aria-valuetext="ariaValueText"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :style="positionStyle"
    @keydown="onKeyDown"
  >
    <slot :saturation="saturation" :value="value" />
  </Primitive>
</template>
