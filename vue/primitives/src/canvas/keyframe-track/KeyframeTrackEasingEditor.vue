<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Embeds a `CurveEditorRoot` (in `'bezier'` interpolation) bound to the SELECTED
 * keyframe's segment easing. The curve's two anchors are pinned at `(0, 0)` and
 * `(1, 1)` (CSS `cubic-bezier` semantics); the start anchor's `outHandle` and the
 * end anchor's `inHandle` map to the easing tuple `[x1, y1, x2, y2]`.
 *
 * The binding is one-way IN (the editor is seeded from the keyframe's easing via
 * the CurveEditor `defaultValue`) and one-way OUT (every anchor commit reads the
 * handles back and calls `ctx.setEasing`). The CurveEditor is remounted (keyed on
 * the selected id) whenever the selection changes so its seed always reflects the
 * newly selected keyframe.
 *
 * Renders nothing unless a keyframe with a FOLLOWING segment is selected (the
 * last keyframe has no outgoing segment to ease).
 */
export interface KeyframeTrackEasingEditorProps extends PrimitiveProps {
  /** Sample count for the rendered easing polyline. @default 256 */
  samples?: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { CurveEditorRoot } from '../curve-editor';
import type { CurveEditorAnchor } from '../curve-editor';
import { DEFAULT_KEYFRAME_EASING, useKeyframeTrackContext } from './context';

const { samples = 256, as = 'div' } = defineProps<KeyframeTrackEasingEditorProps>();
const ctx = useKeyframeTrackContext();

const { forwardRef } = useForwardExpose();

// The selected keyframe must exist AND have a following segment to ease.
const selected = computed(() => {
  const id = ctx.selectedId.value;
  if (id === null) return null;
  const list = ctx.keyframes.value;
  const i = list.findIndex(k => k.id === id);
  if (i === -1 || i >= list.length - 1) return null;
  return list[i]!;
});

// Seed anchors for the embedded CurveEditor from the segment's easing tuple.
// Anchors are pinned at (0,0)/(1,1); the handles are the bezier control points
// relative to their anchor (CSS cubic-bezier control points).
const seedAnchors = computed<CurveEditorAnchor[]>(() => {
  const kf = selected.value;
  const e = kf?.easing ?? DEFAULT_KEYFRAME_EASING;
  const [x1, y1, x2, y2] = e;
  return [
    { id: 'kf-easing-start', x: 0, y: 0, outHandle: { x: x1, y: y1 } },
    { id: 'kf-easing-end', x: 1, y: 1, inHandle: { x: x2 - 1, y: y2 - 1 } },
  ];
});

// Read the handles back off the committed anchors and write the easing tuple.
function onAnchorsCommit(anchors: CurveEditorAnchor[]): void {
  const kf = selected.value;
  if (!kf || anchors.length < 2) return;
  const startA = anchors[0]!;
  const endA = anchors[anchors.length - 1]!;
  const x1 = startA.outHandle ? startA.x + startA.outHandle.x : 0;
  const y1 = startA.outHandle ? startA.y + startA.outHandle.y : 0;
  const x2 = endA.inHandle ? endA.x + endA.inHandle.x : 1;
  const y2 = endA.inHandle ? endA.y + endA.inHandle.y : 1;
  ctx.setEasing(kf.id, [x1, y1, x2, y2]);
}
</script>

<template>
  <Primitive
    v-if="selected"
    :ref="forwardRef"
    :as="as"
    data-easing-editor
    :data-disabled="ctx.disabled.value ? '' : undefined"
  >
    <CurveEditorRoot
      :key="selected.id"
      interpolation="bezier"
      :default-value="seedAnchors"
      :samples="samples"
      :disabled="ctx.disabled.value"
      :dir="ctx.direction.value"
      @anchors-commit="onAnchorsCommit"
    >
      <template #default="curveProps">
        <slot v-bind="curveProps" :keyframe="selected" />
      </template>
    </CurveEditorRoot>
  </Primitive>
</template>
