<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The interaction surface. Clips the canvas (`overflow:hidden`), disables native
 * touch gestures (`touch-action:none`), reports its bounding rect into the
 * context as the screen origin for coordinate math, and hosts the wheel/drag
 * pan-zoom, marquee-selection, connection and keyboard layers. Background click
 * clears the selection. Rendered by `FlowRoot`; not usually placed directly.
 */
export interface FlowPaneProps extends PrimitiveProps {
  /** Drag the empty pane to pan. @default true */
  panOnDrag?: boolean;
  /** Wheel scroll pans instead of zooms. @default false */
  panOnScroll?: boolean;
  /** Wheel scroll zooms toward the pointer. @default true */
  zoomOnScroll?: boolean;
  /** Trackpad pinch zooms. @default true */
  zoomOnPinch?: boolean;
  /** Double-click zooms in. @default true */
  zoomOnDoubleClick?: boolean;
}
</script>

<script setup lang="ts">
import { watchEffect } from 'vue';
import { useElementBounding, useEventListener, useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { VisuallyHidden } from '../../utilities/visually-hidden';
import { useFlowContext } from './context';
import { usePanZoom } from './composables/usePanZoom';
import { useConnection } from './composables/useConnection';
import { useMarquee } from './composables/useMarquee';
import { useKeyboard } from './composables/useKeyboard';
import { useViewportApi } from './composables/useViewportApi';

const {
  as = 'div',
  panOnDrag = true,
  panOnScroll = false,
  zoomOnScroll = true,
  zoomOnPinch = true,
  zoomOnDoubleClick = true,
} = defineProps<FlowPaneProps>();

const ctx = useFlowContext();
const { forwardRef, currentElement } = useForwardExpose();

const { left, top, width, height } = useElementBounding(currentElement, { updateTiming: 'next-frame' });
watchEffect(() => {
  ctx.setPaneRect({ left: left.value, top: top.value, width: width.value, height: height.value });
});

const { isPanning } = usePanZoom(currentElement, ctx, {
  panOnDrag,
  panOnScroll,
  zoomOnScroll,
  zoomOnPinch,
  zoomOnDoubleClick,
});

useConnection(ctx);
const { rect: marquee } = useMarquee(currentElement, ctx);
useKeyboard(currentElement, ctx, useViewportApi(ctx));

useEventListener(currentElement, 'click', (event: MouseEvent) => {
  const target = event.target as Element | null;
  if (target && !target.closest('[data-flow-node],[data-flow-edge]'))
    ctx.clearSelection();
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    data-flow-pane=""
    :data-panning="isPanning ? '' : undefined"
    :data-interactive="ctx.interactive.value ? '' : undefined"
    :role="ctx.disableKeyboardA11y.value ? undefined : 'application'"
    :tabindex="ctx.disableKeyboardA11y.value ? undefined : 0"
    :style="{ position: 'relative', overflow: 'hidden', touchAction: 'none' }"
  >
    <slot />

    <div
      v-if="marquee"
      data-flow-selection-rect=""
      :style="{
        position: 'absolute',
        top: '0',
        left: '0',
        transform: `translate(${marquee.x}px, ${marquee.y}px)`,
        width: `${marquee.width}px`,
        height: `${marquee.height}px`,
        pointerEvents: 'none',
      }"
    />

    <VisuallyHidden
      aria-live="polite"
      aria-atomic="true"
    >
      <slot name="a11y-status" />
    </VisuallyHidden>
  </Primitive>
</template>
