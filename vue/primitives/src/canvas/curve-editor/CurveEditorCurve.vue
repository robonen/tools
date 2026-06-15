<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The rendered curve of a `CurveEditorRoot`, an SVG `<path>` whose `d` is built
 * by sampling `f(x)` across `domainX` (or the per-anchor bezier path in
 * `'bezier'` mode) and projecting each sample to pixels. It is decorative
 * (`role="presentation"` / `aria-hidden`) — the accessible controls are the
 * `CurveEditorPoint` thumbs. The path `d` is also exposed as a slot prop for
 * custom rendering (fills, glows).
 */
export interface CurveEditorCurveProps extends PrimitiveProps {
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useCurveEditorContext } from './context';
import { useForwardExpose } from '@robonen/vue';
import { buildBezierPath, buildPolylinePath, sampleFnToPolyline } from '../../internal/spline';

const { as = 'path' } = defineProps<CurveEditorCurveProps>();
const ctx = useCurveEditorContext();

/** Project a domain point to pixel space via the axis scales. */
function project(x: number, y: number): { x: number; y: number } {
  return { x: ctx.scaleX.scale(x), y: ctx.scaleY.scale(y) };
}

const SAMPLES = 256;

const pathD = computed<string>(() => {
  const [x0, x1] = ctx.domainX.value;

  if (ctx.interpolation.value === 'bezier') {
    // Per-segment cubic: chain `M … C … C …` through projected anchors/handles.
    const list = ctx.anchors.value;
    if (list.length < 2) return '';
    let d = '';
    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i]!;
      const b = list[i + 1]!;
      const dx = b.x - a.x;
      const c1x = a.outHandle ? a.x + a.outHandle.x : a.x + dx / 3;
      const c1y = a.outHandle ? a.y + a.outHandle.y : a.y + (b.y - a.y) / 3;
      const c2x = b.inHandle ? b.x + b.inHandle.x : b.x - dx / 3;
      const c2y = b.inHandle ? b.y + b.inHandle.y : b.y - (b.y - a.y) / 3;
      const p0 = project(a.x, a.y);
      const pc1 = project(c1x, c1y);
      const pc2 = project(c2x, c2y);
      const p3 = project(b.x, b.y);
      const seg = buildBezierPath(p0, pc1, pc2, p3);
      // Drop the leading `M` on subsequent segments (they continue the path).
      d += i === 0 ? seg : seg.replace(/^M[^C]*/, '');
    }
    return d;
  }

  // Sampled `y = f(x)` polyline projected to pixels.
  const samples = sampleFnToPolyline(x => ctx.sample(x), x0, x1, SAMPLES);
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i]!;
    samples[i] = project(p.x, p.y);
  }
  return buildPolylinePath(samples);
});

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :d="as === 'path' ? pathD : undefined"
    role="presentation"
    aria-hidden="true"
    fill="none"
    data-curve-editor-curve=""
  >
    <slot :d="pathD" />
  </Primitive>
</template>
