<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The keyboard- and screen-reader-accessible divider handle, rendered as
 * `role="slider"` with full ARIA value attributes (`aria-valuemin=0`,
 * `aria-valuemax=100`, `aria-valuenow=position`). It positions itself at the
 * divider and handles keyboard interaction: Arrow keys move the divider toward
 * the after/before layer by `keyboardStep` (orientation- and direction-aware),
 * Shift+Arrow and Page keys by `keyboardLargeStep`, and Home/End jump to 0/100.
 * This is the hit-target / focus element; pair it with a thin presentational
 * `CompareSliderDivider` for the visible line. Exposes `position` as a slot prop.
 */
export interface CompareSliderHandleProps extends PrimitiveProps {
  /**
   * Optional formatter producing this handle's `aria-valuetext`. Overrides the
   * root-level `valueText` for this handle when provided. Receives the reveal
   * position (0–100).
   */
  valueText?: (position: number) => string | undefined;
  // `aria-label` (and other ARIA attributes) fall through to the rendered
  // `role="slider"` element; a default of 'Comparison position' is applied when
  // none is supplied.
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed, useAttrs } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useCompareSliderContext } from './context';

const { as = 'span', valueText } = defineProps<CompareSliderHandleProps>();
const ctx = useCompareSliderContext();
const attrs = useAttrs();
const { forwardRef } = useForwardExpose();

// Position the handle at the divider. Stable shape: same keys in the same order
// for a monomorphic style object; unused sides are explicit `undefined`. The
// `flip` flag selects the positioning edge, matching the after-layer clip side.
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

// Fall back to a generic accessible name when the consumer supplies none.
const accessibleLabel = computed<string | undefined>(() => {
  const hasLabel = attrs['aria-label'] !== undefined && attrs['aria-label'] !== null;
  const hasLabelledBy = attrs['aria-labelledby'] !== undefined && attrs['aria-labelledby'] !== null;
  if (hasLabel || hasLabelledBy) return undefined;
  return 'Comparison position';
});

// Humanised `aria-valuetext`: the per-handle `valueText` prop wins, then the
// root-level formatter; a consumer-supplied `aria-valuetext` attr wins over both.
const valueTextStr = computed<string | undefined>(() => {
  if (attrs['aria-valuetext'] !== undefined && attrs['aria-valuetext'] !== null) return undefined;
  const fmt = valueText ?? ctx.valueText.value;
  return fmt ? fmt(ctx.position.value) : undefined;
});

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const horizontal = ctx.orientation.value === 'horizontal';
  const flip = ctx.flip.value;
  const big = event.shiftKey ? ctx.keyboardLargeStep.value : ctx.keyboardStep.value;
  let delta: number;
  switch (event.key) {
    case 'ArrowRight':
      // Toward the after layer (increase) unless flipped.
      delta = horizontal ? (flip ? -big : big) : 0;
      break;
    case 'ArrowLeft':
      delta = horizontal ? (flip ? big : -big) : 0;
      break;
    case 'ArrowUp':
      // Vertical no-flip reveals the top region; ArrowUp shrinks it (decrease).
      delta = horizontal ? 0 : (flip ? big : -big);
      break;
    case 'ArrowDown':
      delta = horizontal ? 0 : (flip ? -big : big);
      break;
    case 'PageUp':
      delta = horizontal
        ? ctx.keyboardLargeStep.value
        : (flip ? ctx.keyboardLargeStep.value : -ctx.keyboardLargeStep.value);
      break;
    case 'PageDown':
      delta = horizontal
        ? -ctx.keyboardLargeStep.value
        : (flip ? -ctx.keyboardLargeStep.value : ctx.keyboardLargeStep.value);
      break;
    case 'Home':
      event.preventDefault();
      ctx.setPosition(0);
      return;
    case 'End':
      event.preventDefault();
      ctx.setPosition(100);
      return;
    default:
      return;
  }
  if (delta === 0) return;
  event.preventDefault();
  ctx.step(delta);
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="slider"
    :tabindex="ctx.disabled.value ? -1 : 0"
    :aria-label="accessibleLabel"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="ctx.position.value"
    :aria-valuetext="valueTextStr"
    :aria-orientation="ctx.orientation.value"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
    :style="style"
    @keydown="onKeyDown"
  >
    <slot :position="ctx.position.value" />
  </Primitive>
</template>
