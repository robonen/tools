<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The clipping / interaction pane. Clips the content (`overflow: hidden`),
 * disables native touch gestures (`touch-action: none`), reports its live
 * bounding rect into the context as the screen origin for coordinate math, and
 * hosts the wheel / pinch / drag / dblclick / keyboard pan-zoom layer
 * (`useZoomPan`). Carries `role` / `tabindex` for the a11y keyboard layer and
 * reflects gesture state via `data-panning` / `data-zooming` / `data-measured`.
 * Rendered by `ViewportRoot` by default; place directly only when composing the
 * parts manually.
 */
export interface ViewportSurfaceProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import type { Ref } from 'vue';
import { watchEffect } from 'vue';
import { useElementBounding, useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useViewportContext } from './context';
import { useZoomPan } from './useZoomPan';

const { as = 'div' } = defineProps<ViewportSurfaceProps>();

const ctx = useViewportContext();
const { forwardRef, currentElement } = useForwardExpose();

const { left, top, width, height } = useElementBounding(currentElement);
watchEffect(() => {
  ctx.setSurfaceRect({ left: left.value, top: top.value, width: width.value, height: height.value });
});

// `useZoomPan` owns the live gesture flags; mirror them onto the context refs so
// `ViewportContent` / consumers (and the `data-*` attributes below) observe them.
const { isPanning, isZooming } = useZoomPan(currentElement, ctx, ctx.options.value);
watchEffect(() => {
  (ctx.isPanning as Ref<boolean>).value = isPanning.value;
  (ctx.isZooming as Ref<boolean>).value = isZooming.value;
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    data-viewport-surface=""
    :data-panning="ctx.isPanning.value ? '' : undefined"
    :data-zooming="ctx.isZooming.value ? '' : undefined"
    :data-measured="ctx.measured.value ? '' : undefined"
    :data-interactive="ctx.interactive.value ? '' : undefined"
    :role="ctx.options.value.disableKeyboard ? undefined : 'application'"
    :tabindex="ctx.options.value.disableKeyboard ? undefined : 0"
    :style="{ position: 'relative', overflow: 'hidden', touchAction: 'none', width: '100%', height: '100%' }"
  >
    <slot />
  </Primitive>
</template>
