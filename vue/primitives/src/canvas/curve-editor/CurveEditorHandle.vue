<script lang="ts">
import type { CurveEditorAnchor, CurveEditorHandleSide } from './context';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A bezier tangent handle for an anchor, rendered only in `'bezier'`
 * interpolation. Dragging it adjusts the anchor's `inHandle` / `outHandle`
 * tangent (relative deltas), clamped (in easing / `monotonicX` mode) so the
 * cubic segment stays single-valued in x — the handle's x-component can't reach
 * past the neighbouring anchor (`dx >= 0`), preventing an S-fold. It is exposed
 * as `role="slider"` with a descriptive `aria-label`; pass `aria-hidden` to make
 * it purely decorative. Positions itself at the tangent endpoint in pixel space.
 */
export interface CurveEditorHandleProps extends PrimitiveProps {
  /** The anchor whose tangent this handle controls. */
  anchor: CurveEditorAnchor;
  /** Which tangent (`'in'` = incoming, `'out'` = outgoing). */
  side: CurveEditorHandleSide;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useCurveEditorContext } from './context';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useForwardExpose } from '@robonen/vue';

const { anchor, side, as = 'div' } = defineProps<CurveEditorHandleProps>();
const ctx = useCurveEditorContext();

const isBezier = computed(() => ctx.interpolation.value === 'bezier');

// Default tangent (one-third toward the neighbour) when no handle is set yet, so
// the handle is grabbable before the consumer first drags it.
const handle = computed(() => {
  const stored = side === 'in' ? anchor.inHandle : anchor.outHandle;
  if (stored) return stored;
  const list = ctx.anchors.value;
  const i = ctx.indexOf(anchor.id);
  const neighbour = side === 'out' ? list[i + 1] : list[i - 1];
  if (!neighbour) return { x: 0, y: 0 };
  return { x: (neighbour.x - anchor.x) / 3, y: (neighbour.y - anchor.y) / 3 };
});

// Tangent endpoint in domain space → pixels.
const tip = computed(() => {
  const h = handle.value;
  return {
    x: ctx.scaleX.scale(anchor.x + h.x),
    y: ctx.scaleY.scale(anchor.y + h.y),
  };
});

const positionStyle = computed<{ left: string; top: string }>(() => ({
  left: `${tip.value.x}px`,
  top: `${tip.value.y}px`,
}));

const ariaLabel = computed(() => side === 'in' ? 'Incoming tangent handle' : 'Outgoing tangent handle');

const { forwardRef, currentElement } = useForwardExpose();

let originX = 0;
let originY = 0;
usePointerDrag(currentElement, {
  axis: 'both',
  threshold: 0,
  disabled: () => ctx.disabled.value || !isBezier.value,
  onStart: () => {
    originX = tip.value.x;
    originY = tip.value.y;
  },
  onMove: (state) => {
    // Invert the dragged tip to domain space, then store the tangent relative to
    // the anchor. `updateHandle` clamps for monotonic-x safety. Live update only;
    // `anchorsCommit` is emitted once on settle (onCommit), not per rAF frame.
    const tipX = ctx.scaleX.invert(originX + state.total.x);
    const tipY = ctx.scaleY.invert(originY + state.total.y);
    ctx.updateHandle(anchor.id, side, { x: tipX - anchor.x, y: tipY - anchor.y });
  },
  // Successful pointerup only (never on cancel/abort): emit the settled anchors.
  onCommit: () => ctx.commit(),
});
</script>

<template>
  <Primitive
    v-if="isBezier"
    :ref="forwardRef"
    :as="as"
    role="slider"
    :aria-label="ariaLabel"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-side="side"
    :style="positionStyle"
    @keydown.stop
  >
    <slot :handle="handle" :x="tip.x" :y="tip.y" />
  </Primitive>
</template>
