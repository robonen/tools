<script lang="ts">
import type { CSSProperties } from 'vue';
import type { PrimitiveProps } from '../../internal/primitive';
import type { TransformBoxHandlePosition } from './utils';

/**
 * One of the eight scale handles on a `TransformBoxRoot` (four edges + four
 * corners). Rendered as a native focusable `<button type="button">` so it is
 * keyboard-reachable and announced; the default `aria-label` is derived from
 * `position` (e.g. `"Resize top-left"`).
 *
 * Dragging resizes the edge/corner it controls while the OPPOSITE edge stays
 * anchored in world space — even when the box is rotated, because the root
 * rotates the screen delta into the box's local axes first. Hold Shift on a
 * corner to lock the aspect ratio, Alt to resize symmetrically about the pivot.
 * When `allowFlip` is `false` on the root, pushing past the anchor clamps at the
 * minimum size instead of flipping.
 *
 * Keyboard (when focused): Arrow keys resize by the root's `keyboardStep`,
 * Shift+Arrow aspect-locks, Alt+Arrow resizes symmetrically about the pivot.
 */
export interface TransformBoxHandleProps extends PrimitiveProps {
  /** Which edge or corner this handle controls. */
  position: TransformBoxHandlePosition;
}
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useTransformBoxContext } from './context';
import { handleLabel } from './utils';

const { as = 'button', position } = defineProps<TransformBoxHandleProps>();
const ctx = useTransformBoxContext();
const attrs = useAttrs();

const handleRef = shallowRef<HTMLElement | null>(null);

// `usePointerDrag.onEnd` fires on BOTH pointerup and pointercancel and clears
// the gesture state; `onCommit` fires AFTER `onEnd` on a successful pointerup
// only and emits `transformCommit`. Splitting the two means a cancel tears down
// without emitting while a real release commits.
usePointerDrag(handleRef, {
  threshold: 0,
  // A press on a handle must NOT bubble to the root's move gesture.
  stopPropagation: true,
  disabled: () => ctx.disabled.value,
  onStart: () => {
    ctx.beginScale(position);
  },
  onMove: (state) => {
    ctx.updateScale(position, { x: state.total.x, y: state.total.y }, {
      shift: state.modifiers.shift,
      alt: state.modifiers.alt,
    });
  },
  onEnd: () => {
    ctx.endScale(false);
  },
  onCommit: () => {
    ctx.endScale(true);
  },
});

// Default aria-label only when the consumer has not supplied one.
const accessibleLabel = computed<string | undefined>(() => {
  const hasLabel = attrs['aria-label'] !== undefined && attrs['aria-label'] !== null;
  const hasLabelledBy = attrs['aria-labelledby'] !== undefined && attrs['aria-labelledby'] !== null;
  if (hasLabel || hasLabelledBy) return undefined;
  return handleLabel(position);
});

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const step = ctx.keyboardStep.value;
  const mods = { shift: event.shiftKey, alt: event.altKey };
  // Map an arrow to a LOCAL-axis edge delta. The sign already matches the
  // box's own axes (handle math anchors the opposite edge), so a right-edge
  // ArrowRight grows width regardless of which edge is dragged.
  let dx = 0;
  let dy = 0;
  switch (event.key) {
    case 'ArrowLeft':
      dx = -step;
      break;
    case 'ArrowRight':
      dx = step;
      break;
    case 'ArrowUp':
      dy = -step;
      break;
    case 'ArrowDown':
      dy = step;
      break;
    default:
      return;
  }
  event.preventDefault();
  // Stop the body's arrow-move from also firing.
  event.stopPropagation();
  ctx.nudgeScale(position, dx, dy, mods);
}

const positionStyle = computed<CSSProperties>(() => {
  // Place the handle at its edge/corner. Corners → exact corners; edges →
  // edge midpoints. Centered via translate so a non-zero box keeps handles on
  // the boundary even at w=0/h=0 (they stack at the single point but remain
  // individually targetable since each is a separate focusable button).
  const left = position.includes('left') ? '0%' : position.includes('right') ? '100%' : '50%';
  const top = position.includes('top') ? '0%' : position.includes('bottom') ? '100%' : '50%';
  return {
    position: 'absolute',
    left,
    top,
    transform: 'translate(-50%, -50%)',
    touchAction: 'none',
  };
});

defineExpose({ position });

// `useForwardExpose` runs AFTER `defineExpose` so it merges the prior expose
// bindings; `currentElement` resolves the underlying button for the drag.
const { forwardRef, currentElement } = useForwardExpose();
watch(currentElement, (el) => {
  handleRef.value = el ?? null;
}, { immediate: true });
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    :data-position="position"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :aria-label="accessibleLabel"
    :aria-disabled="ctx.disabled.value || undefined"
    :tabindex="ctx.disabled.value ? -1 : 0"
    :style="positionStyle"
    @keydown="onKeyDown"
  >
    <slot :position="position" />
  </Primitive>
</template>
