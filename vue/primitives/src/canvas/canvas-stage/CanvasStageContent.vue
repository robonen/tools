<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The transformed content layer of a `CanvasStage`. Wraps the zoom-pan
 * `ViewportContent` (one GPU-composited `transform`, `transform-origin: 0 0`) and
 * renders the consumer's `<img>` / `<video>` / `<canvas>` via the default slot.
 *
 * When the `CanvasStageRoot` has no explicit `contentWidth`/`contentHeight`, this
 * part measures its own intrinsic content size with a `ResizeObserver`
 * (`useElementSize`) and reports it to the context so `fitView` / `zoomToActual`
 * / `fitFill` can compute. `ResizeObserver` reports the *layout* (content-box)
 * size, which is immune to the CSS `transform` the viewport applies — so the
 * measured size is the true unscaled content size at any zoom, never the
 * `getBoundingClientRect` post-scale geometry.
 */
export interface CanvasStageContentProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { shallowRef, watch } from 'vue';
import { useElementSize, useForwardExpose } from '@robonen/vue';
import { ViewportContent } from '../zoom-pan';
import { useCanvasStageContext } from './context';

const { as = 'div' } = defineProps<CanvasStageContentProps>();

const ctx = useCanvasStageContext();
const { forwardRef } = useForwardExpose();

// The `ViewportContent` layer is forced to the pane size (`inset: 0`), so it is
// NOT a meaningful content measurement. Instead we measure a tight inner wrapper
// (`position: absolute; top/left: 0` — it shrinks to its content) so the
// intrinsic `<img>` / `<video>` size is what's observed. `useElementSize` reads
// the content-box, which is immune to the viewport's CSS `transform`.
const measureEl = shallowRef<HTMLElement | null>(null);
const { width, height } = useElementSize(measureEl);
watch([width, height], ([w, h]) => {
  if (ctx.autoMeasure.value) ctx.setMeasuredContentSize({ width: w, height: h });
}, { immediate: true });
</script>

<template>
  <ViewportContent
    :ref="forwardRef"
    :as="as"
    v-bind="{ 'data-canvas-stage-content': '' }"
  >
    <div
      ref="measureEl"
      :style="{ position: 'absolute', top: '0', left: '0' }"
      v-bind="{ 'data-canvas-stage-content-box': '' }"
    >
      <slot />
    </div>
  </ViewportContent>
</template>
