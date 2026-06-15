<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The inner clipping / measurement box of a `CanvasStage` (mirrors flow's
 * `FlowPane`). It renders the zoom-pan `ViewportSurface`, so it already clips the
 * content (`overflow: hidden`), positions relatively, disables native touch
 * gestures (`touch-action: none`), and reports its live bounding rect into the
 * zoom-pan context as the coordinate origin. Kept a *real* element (never
 * `as="template"`) so `getBoundingClientRect` measures the actual clip box that
 * the fit / 1:1 / fill maths key off — the `CanvasStageRoot` may itself be
 * `as="template"`, which is exactly why measurement lives here and not on the
 * Root. Rendered by `CanvasStageRoot`; not usually placed directly.
 */
export interface CanvasStagePaneProps extends PrimitiveProps {}

export interface CanvasStagePaneEmits {
  /** Fires with the resolved pane element (or `null` on teardown) for measurement. */
  pane: [el: HTMLElement | null];
}
</script>

<script setup lang="ts">
import { watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { ViewportSurface } from '../zoom-pan';

const { as = 'div' } = defineProps<CanvasStagePaneProps>();
const emit = defineEmits<CanvasStagePaneEmits>();

const { forwardRef, currentElement } = useForwardExpose();

// Surface the rendered pane element to `CanvasStageRoot` so it can drive the
// fit/actual/fill maths off the real clip box.
watch(currentElement, (el) => {
  emit('pane', (el as HTMLElement | undefined) ?? null);
}, { immediate: true });
</script>

<template>
  <ViewportSurface
    :ref="forwardRef"
    :as="as"
    v-bind="{ 'data-canvas-stage-pane': '' }"
  >
    <slot />
  </ViewportSurface>
</template>
