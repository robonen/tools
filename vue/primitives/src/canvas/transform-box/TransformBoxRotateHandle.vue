<script lang="ts">
import type { CSSProperties } from 'vue';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The rotate handle of a `TransformBoxRoot`, rendered as a native focusable
 * `<button type="button">` with a default `aria-label` of `"Rotate"`. Dragging
 * it rotates the box about the root's `pivot`: the root computes the angle from
 * the pivot to the pointer with `atan2` and accumulates the signed shortest
 * delta so dragging across the 0°/360° seam stays smooth. Holding Shift snaps
 * the rotation to the root's `rotationSnap` increments.
 *
 * Keyboard (when focused): Arrow Left/Down rotate by `-rotationStep`, Arrow
 * Right/Up by `+rotationStep`; Shift+Arrow rotates by `rotationSnap` (when set).
 *
 * Position it yourself (commonly a stem above the top edge) via CSS; the default
 * style centers it on the top-center of the box.
 */
export interface TransformBoxRotateHandleProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useTransformBoxContext } from './context';

const { as = 'button' } = defineProps<TransformBoxRotateHandleProps>();
const ctx = useTransformBoxContext();
const attrs = useAttrs();

const handleRef = shallowRef<HTMLElement | null>(null);

usePointerDrag(handleRef, {
  threshold: 0,
  stopPropagation: true,
  disabled: () => ctx.disabled.value,
  onStart: (state) => {
    ctx.beginRotate({ x: state.point.x, y: state.point.y }, handleRef.value!);
  },
  onMove: (state) => {
    ctx.updateRotate({ x: state.point.x, y: state.point.y }, {
      shift: state.modifiers.shift,
      alt: state.modifiers.alt,
    });
  },
  onEnd: () => {
    ctx.endRotate(false);
  },
  onCommit: () => {
    ctx.endRotate(true);
  },
});

const accessibleLabel = computed<string | undefined>(() => {
  const hasLabel = attrs['aria-label'] !== undefined && attrs['aria-label'] !== null;
  const hasLabelledBy = attrs['aria-labelledby'] !== undefined && attrs['aria-labelledby'] !== null;
  if (hasLabel || hasLabelledBy) return undefined;
  return 'Rotate';
});

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const snap = ctx.rotationSnap.value;
  const unit = event.shiftKey && snap > 0 ? snap : ctx.rotationStep.value;
  let delta: number;
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      delta = unit;
      break;
    case 'ArrowLeft':
    case 'ArrowDown':
      delta = -unit;
      break;
    default:
      return;
  }
  event.preventDefault();
  event.stopPropagation();
  ctx.nudgeRotate(delta);
}

const positionStyle = computed<CSSProperties>(() => ({
  position: 'absolute',
  left: '50%',
  top: '0%',
  transform: 'translate(-50%, -50%)',
  touchAction: 'none',
}));

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
    data-transform-box-rotate=""
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :aria-label="accessibleLabel"
    :aria-disabled="ctx.disabled.value || undefined"
    :tabindex="ctx.disabled.value ? -1 : 0"
    :style="positionStyle"
    @keydown="onKeyDown"
  >
    <slot :rotation="ctx.value.value.rotation" />
  </Primitive>
</template>
