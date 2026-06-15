<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * An accessible zoom-level announcer for a `CanvasStage`. Renders a
 * `VisuallyHidden` `aria-live="polite"` / `aria-atomic` region that announces the
 * current zoom percentage to screen readers. To avoid flooding the live region
 * during a pinch / wheel gesture it announces on *settle* — the value is
 * debounced, so a burst of per-frame zoom changes collapses into a single
 * announcement once motion stops.
 *
 * The default slot receives the live `{ zoom, percent }` so consumers can ALSO
 * render a visible indicator (e.g. a "120 %" badge) with the same value.
 */
export interface CanvasStageZoomIndicatorProps extends PrimitiveProps {
  /**
   * Build the announced/visible string from the rounded zoom percentage.
   * @default (percent) => `${percent}%`
   */
  format?: (percent: number) => string;
  /** Debounce before announcing, in ms (the "settle" window). @default 200 */
  settleDelay?: number;
}
</script>

<script setup lang="ts">
import { shallowRef, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { VisuallyHidden } from '../../utilities/visually-hidden';
import { useCanvasStageContext } from './context';

const {
  as = 'div',
  format = (percent: number) => `${percent}%`,
  settleDelay = 200,
} = defineProps<CanvasStageZoomIndicatorProps>();

const ctx = useCanvasStageContext();
const { forwardRef } = useForwardExpose();

/** Live zoom percentage (rounded), updated every frame for the visible slot. */
const percent = shallowRef(Math.round(ctx.viewport.value.zoom * 100));

/** Debounced announcement — only written once zoom settles. */
const announced = shallowRef('');

let timer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => ctx.viewport.value.zoom,
  (zoom) => {
    percent.value = Math.round(zoom * 100);
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      announced.value = format(percent.value);
      timer = null;
    }, settleDelay);
  },
  { immediate: true },
);
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    data-canvas-stage-zoom-indicator=""
  >
    <slot
      :zoom="ctx.viewport.value.zoom"
      :percent="percent"
    />
    <VisuallyHidden v-bind="{ 'aria-live': 'polite', 'aria-atomic': 'true' }">
      {{ announced }}
    </VisuallyHidden>
  </Primitive>
</template>
