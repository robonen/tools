<script lang="ts">
import type { CropHandlePosition } from './utils';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * One of the eight resize handles — four corners and four edge midpoints. Render
 * eight of these inside `CropArea`, one per `position`. Each is a native
 * `<button type="button">` with an `aria-label` ("Resize top-left", etc.) and
 * keyboard edge-resize: arrow keys move that edge/corner with the opposite edge
 * fixed (Shift = large step), honouring aspect-ratio, min size, and bounds.
 * Dragging resizes the same way. Positioned at its anchor on the crop box edge.
 */
export interface CropHandleProps extends PrimitiveProps {
  /** Which of the eight handles this is. */
  position: CropHandlePosition;
  /** Accessible label override (defaults to "Resize <position>"). */
  label?: string;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useCropContext } from './context';

const { position, label = undefined, as = 'button' } = defineProps<CropHandleProps>();

const ctx = useCropContext();
const { forwardRef, currentElement } = useForwardExpose();

const DEFAULT_LABELS: Record<CropHandlePosition, string> = {
  'top-left': 'Resize top-left',
  top: 'Resize top',
  'top-right': 'Resize top-right',
  right: 'Resize right',
  'bottom-right': 'Resize bottom-right',
  bottom: 'Resize bottom',
  'bottom-left': 'Resize bottom-left',
  left: 'Resize left',
};

const accessibleLabel = computed(() => label ?? DEFAULT_LABELS[position]);

// Anchor the handle on the crop box edge in percentages of the box (the box is
// the CropArea, whose 0%..100% spans the crop rect). RTL mirrors the x anchor.
const anchorStyle = computed<{ position: string; left: string; top: string }>(() => {
  const rtl = ctx.direction.value === 'rtl';
  let xPct = position.includes('left') ? 0 : position.includes('right') ? 100 : 50;
  if (rtl) xPct = 100 - xPct;
  const yPct = position.includes('top') ? 0 : position.includes('bottom') ? 100 : 50;
  return { position: 'absolute', left: `${xPct}%`, top: `${yPct}%` };
});

function onPointerDown(event: PointerEvent): void {
  if (ctx.disabled.value) return;
  ctx.beginResize(position, event, currentElement.value ?? null);
}

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value || ctx.rect.value === null) return;
  const rtl = ctx.direction.value === 'rtl';
  const stepX = event.shiftKey ? ctx.keyboardLargeStepX.value : ctx.keyboardStepX.value;
  const stepY = event.shiftKey ? ctx.keyboardLargeStepY.value : ctx.keyboardStepY.value;
  let dx = 0;
  let dy = 0;
  switch (event.key) {
    case 'ArrowLeft':
      dx = rtl ? stepX : -stepX;
      break;
    case 'ArrowRight':
      dx = rtl ? -stepX : stepX;
      break;
    case 'ArrowUp':
      dy = -stepY;
      break;
    case 'ArrowDown':
      dy = stepY;
      break;
    default:
      return;
  }
  event.preventDefault();
  // Keep the keypress from also reaching CropArea's move handler (handles are
  // nested inside the area, so the event would otherwise bubble and move the
  // whole rect on top of the resize).
  event.stopPropagation();
  ctx.nudgeResize(position, dx, dy);
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    :aria-label="accessibleLabel"
    :aria-disabled="ctx.disabled.value || undefined"
    :disabled="as === 'button' && ctx.disabled.value ? true : undefined"
    :tabindex="ctx.disabled.value ? -1 : 0"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-position="position"
    :style="anchorStyle"
    @pointerdown="onPointerDown"
    @keydown="onKeyDown"
  >
    <slot />
  </Primitive>
</template>
