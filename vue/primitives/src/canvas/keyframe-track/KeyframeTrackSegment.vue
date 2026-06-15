<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The interval between two adjacent keyframes — the visual + interactive
 * representation of a segment's easing. It spans from the keyframe identified by
 * `keyframeId` to the next keyframe in time order, and clicking it selects the
 * starting keyframe (so the easing editor can edit this segment's curve).
 *
 * It is `role="presentation"` by default (decorative); the keyframes themselves
 * are the focusable controls. When `samples` is set it also renders an SVG
 * `<path>` of the eased value curve across the segment (sampled via the shared
 * spline), so consumers get a ready-to-style preview of the easing.
 */
export interface KeyframeTrackSegmentProps extends PrimitiveProps {
  /** The id of the keyframe that STARTS this segment. */
  keyframeId: string;
  /**
   * When set, render an SVG path of the eased value curve sampled this many
   * times across the segment (exposed as the `path` slot prop). @default 0
   */
  samples?: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useKeyframeTrackContext } from './context';

const { keyframeId, samples = 0, as = 'div' } = defineProps<KeyframeTrackSegmentProps>();
const ctx = useKeyframeTrackContext();

// O(1) lookup via the root's memoized id → index map instead of an O(n)
// findIndex scan per segment on every drag frame.
const startIndex = computed(() => ctx.indexById.value.get(keyframeId) ?? -1);
const start = computed(() => ctx.keyframes.value[startIndex.value]);
const end = computed(() => {
  const i = startIndex.value;
  return i === -1 ? undefined : ctx.keyframes.value[i + 1];
});

const isSelected = computed(() => ctx.selectedId.value === keyframeId);

// Pixel span of the segment along the time axis.
const left = computed(() => (start.value ? ctx.projection(start.value.time) : 0));
const right = computed(() => (end.value ? ctx.projection(end.value.time) : left.value));
const width = computed(() => Math.abs(right.value - left.value));

const positionStyle = computed<{ left: string; width: string }>(() => ({
  left: `${Math.min(left.value, right.value)}px`,
  width: `${width.value}px`,
}));

// Optional SVG path of the eased value curve across the segment (lane-relative
// pixels). Uses the value projection in `valueAxis` mode; otherwise normalizes
// to the lane height so the easing shape is still previewable.
const path = computed<string>(() => {
  const a = start.value;
  const b = end.value;
  const n = samples;
  if (!a || !b || n < 2) return '';
  const x0 = ctx.projection(a.time);
  const x1 = ctx.projection(b.time);
  const h = ctx.laneHeight.value || 1;
  const valueAxis = ctx.valueAxis.value;
  // Build each "M/L x,y" command into a packed array and join once, instead of
  // repeated string concatenation per sample on the drag hot path.
  const segs: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const time = a.time + (b.time - a.time) * t;
    const x = x0 + (x1 - x0) * t;
    const value = ctx.sampleAt(time);
    const y = valueAxis
      ? ctx.projectValue(value)
      // Normalize value into the lane height (value-up) when there is no y-axis.
      : h - normalize(value, a.value, b.value) * h;
    segs.push(`${i === 0 ? 'M' : 'L'}${round(x)},${round(y)}`);
  }
  return segs.join(' ');
});

function normalize(value: number, a: number, b: number): number {
  if (a === b) return 0.5;
  const t = (value - a) / (b - a);
  return Math.min(Math.max(t, 0), 1);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function onSelect(): void {
  if (ctx.disabled.value) return;
  ctx.select(keyframeId);
}

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    v-if="start && end"
    :ref="forwardRef"
    :as="as"
    role="presentation"
    data-segment
    :data-selected="isSelected ? '' : undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :style="positionStyle"
    @pointerdown="onSelect"
  >
    <slot
      :start="start"
      :end="end"
      :selected="isSelected"
      :width="width"
      :path="path"
    />
  </Primitive>
</template>
