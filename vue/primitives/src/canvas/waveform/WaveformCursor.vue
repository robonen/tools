<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { WaveformTimeFormatter } from './context';

/**
 * The playback cursor, rendered as `role="slider"` over `[0, duration]` with
 * `aria-valuenow` = the current time. It positions itself at
 * `projection(currentTime)` and is fully keyboard-driven: Arrow Left/Right scrub
 * by `step` seconds (Shift by `largeStep`), Home/End jump to `0`/`duration`,
 * PageUp/PageDown seek by one visible window. Give it an `aria-label` (defaults
 * to "Playback position"). `aria-valuetext` comes from `timeFormatter` (falling
 * back to the root's, then `formatClock`).
 */
export interface WaveformCursorProps extends PrimitiveProps {
  /**
   * Formatter for `aria-valuetext`. Overrides the root's formatter for this
   * cursor only. @default the root's `timeFormatter` (`formatClock`)
   */
  timeFormatter?: WaveformTimeFormatter;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, useAttrs, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useWaveformContext } from './context';

const { as = 'div', timeFormatter } = defineProps<WaveformCursorProps>();
const ctx = useWaveformContext();
const attrs = useAttrs();

const { forwardRef, currentElement } = useForwardExpose();

watch(currentElement, (el) => {
  ctx.registerCursor((el ?? null) as HTMLElement | null);
});
onBeforeUnmount(() => ctx.registerCursor(null));

const time = computed(() => ctx.currentTime.value);
const duration = computed(() => (ctx.duration.value > 0 ? ctx.duration.value : 0));

// Pixel x within the body. Pinned to 0 when empty / unmeasured.
const offsetPx = computed(() => {
  if (ctx.isEmpty.value || ctx.width.value <= 0) return 0;
  return ctx.projection.scale(time.value);
});

const positionStyle = computed<{
  left: string | undefined;
  right: string | undefined;
}>(() => {
  const px = `${offsetPx.value}px`;
  if (ctx.direction.value === 'rtl') return { left: undefined, right: px };
  return { left: px, right: undefined };
});

const accessibleLabel = computed<string | undefined>(() => {
  const hasLabel = attrs['aria-label'] !== undefined && attrs['aria-label'] !== null;
  const hasLabelledBy = attrs['aria-labelledby'] !== undefined && attrs['aria-labelledby'] !== null;
  if (hasLabel || hasLabelledBy) return undefined;
  return 'Playback position';
});

const valueText = computed<string | undefined>(() => {
  if (attrs['aria-valuetext'] !== undefined && attrs['aria-valuetext'] !== null) return undefined;
  const fmt = timeFormatter ?? ctx.timeFormatter.value;
  return fmt(time.value);
});

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const rtl = ctx.direction.value === 'rtl';
  const stepS = event.shiftKey ? ctx.largeStep.value : ctx.step.value;
  let delta: number;
  switch (event.key) {
    case 'ArrowRight':
      delta = rtl ? -stepS : stepS;
      break;
    case 'ArrowLeft':
      delta = rtl ? stepS : -stepS;
      break;
    case 'Home':
      event.preventDefault();
      ctx.seek(0, true);
      return;
    case 'End':
      event.preventDefault();
      ctx.seek(duration.value, true);
      return;
    case 'PageUp': {
      event.preventDefault();
      const [ws, we] = ctx.window.value;
      ctx.seek(time.value + (we - ws), true);
      return;
    }
    case 'PageDown': {
      event.preventDefault();
      const [ws, we] = ctx.window.value;
      ctx.seek(time.value - (we - ws), true);
      return;
    }
    default:
      return;
  }
  if (delta === 0) return;
  event.preventDefault();
  ctx.seek(time.value + delta, true);
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
    :aria-valuemax="duration"
    :aria-valuenow="time"
    :aria-valuetext="valueText"
    aria-orientation="horizontal"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-empty="ctx.isEmpty.value ? '' : undefined"
    :style="positionStyle"
    @keydown="onKeyDown"
  >
    <slot :time="time" :offset="offsetPx" />
  </Primitive>
</template>
