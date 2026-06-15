<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A single draggable color stop, rendered as `role="slider"`. It positions
 * itself along the track by its `position` (`left: position * 100%`), carries
 * the full ARIA value attributes (`aria-valuemin=0`, `aria-valuemax=1`,
 * `aria-valuenow=position`, and an `aria-valuetext` of `` `<color> at <pct>%` ``
 * — color is NEVER surfaced alone, WCAG 1.4.1), and reflects selection via
 * `aria-selected` + `data-selected`.
 *
 * Only the selected stop is tabbable (roving tabindex); the arrow keys move it.
 * Dragging moves the position with snapping and either neighbour-clamp or
 * cross-and-re-sort per the root's `reorder`. Delete / Backspace removes it
 * (a no-op at `minStops`). Give the stop an `aria-label` (defaults to
 * `Stop N of M`). Exposes `{ stop, index, selected, percent }` as slot props.
 */
export interface GradientEditorStopProps extends PrimitiveProps {
  /** The id of the stop this thumb represents. */
  stopId: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useGradientEditorContext } from './context';
import { usePointerDrag } from '../../internal/pointer-drag';
import { defaultStopValueText } from './utils';

const { as = 'span', stopId } = defineProps<GradientEditorStopProps>();

const ctx = useGradientEditorContext();
const attrs = useAttrs();
const { forwardRef, currentElement } = useForwardExpose();

// Register the element so the root can move roving focus between stops.
watch(currentElement, (el) => {
  ctx.registerStopEl(stopId, el ?? null);
}, { immediate: true });

// Single O(1) lookup into the root's memoized id->{stop,index} map, shared by
// every mounted stop. Replaces a per-stop `find` + `indexOf` (two O(n) scans of
// the wholesale-replaced sorted array on every drag frame, i.e. O(n^2)/frame).
const entry = computed(() => ctx.stopIndex.value.get(stopId) ?? null);
const stop = computed(() => entry.value?.stop ?? null);
const index = computed(() => entry.value?.index ?? -1);
const total = computed(() => ctx.stops.value.length);
const position = computed(() => stop.value?.position ?? 0);
const color = computed(() => stop.value?.color ?? 'transparent');
const selected = computed(() => ctx.selectedId.value === stopId);

const percentage = computed(() => position.value * 100);

// `left: P%` keeps a stable, monomorphic style shape (dir flips via the `dir`
// attribute inherited from the root, mirroring the slider's positioning).
const positionStyle = computed<{
  left: string | undefined;
  right: string | undefined;
}>(() => {
  const edge = `${percentage.value}%`;
  if (ctx.direction.value === 'rtl') return { left: undefined, right: edge };
  return { left: edge, right: undefined };
});

// Roving tabindex: only the selected stop is in the tab order; when nothing is
// selected the first stop is tabbable so Tab can still enter the editor.
const tabindex = computed<number>(() => {
  if (ctx.disabled.value) return -1;
  if (selected.value) return 0;
  if (ctx.selectedId.value === null && index.value === 0) return 0;
  return -1;
});

const accessibleLabel = computed<string | undefined>(() => {
  const hasLabel = attrs['aria-label'] !== undefined && attrs['aria-label'] !== null;
  const hasLabelledBy = attrs['aria-labelledby'] !== undefined && attrs['aria-labelledby'] !== null;
  if (hasLabel || hasLabelledBy) return undefined;
  return `Stop ${index.value + 1} of ${total.value}`;
});

// `aria-valuetext` always pairs color WITH position (WCAG 1.4.1). A consumer
// `aria-valuetext` attr wins (it falls through via `$attrs`).
const valueTextAttr = computed<string | undefined>(() => {
  if (attrs['aria-valuetext'] !== undefined && attrs['aria-valuetext'] !== null) return undefined;
  const fmt = ctx.valueText.value;
  return fmt ? fmt(color.value, position.value) : defaultStopValueText(color.value, position.value);
});

function onSelect(): void {
  if (ctx.disabled.value) return;
  if (!selected.value) ctx.select(stopId);
}

// ── pointer drag (x → position) ─────────────────────────────────────────────
let dragStartPosition = 0;

usePointerDrag(currentElement, {
  axis: 'x',
  threshold: 0,
  disabled: () => ctx.disabled.value,
  // Stop the press from bubbling to the track (which would add a stop).
  stopPropagation: true,
  onStart: () => {
    onSelect();
    dragStartPosition = position.value;
  },
  onMove: (state) => {
    const track = ctx.trackRef.value;
    if (!track) return;
    const width = track.getBoundingClientRect().width;
    if (width === 0) return;
    let deltaFraction = state.total.x / width;
    if (ctx.direction.value === 'rtl') deltaFraction = -deltaFraction;
    ctx.moveStop(stopId, dragStartPosition + deltaFraction);
  },
});

// ── keyboard ────────────────────────────────────────────────────────────────
function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const ltr = ctx.direction.value !== 'rtl';
  const step = ctx.step.value;
  const big = ctx.largeStep.value;
  const unit = event.shiftKey ? big : step;
  const cur = position.value;
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      ctx.moveStop(stopId, cur + (ltr ? unit : -unit));
      return;
    case 'ArrowLeft':
      event.preventDefault();
      ctx.moveStop(stopId, cur + (ltr ? -unit : unit));
      return;
    case 'PageUp':
      event.preventDefault();
      ctx.moveStop(stopId, cur + big);
      return;
    case 'PageDown':
      event.preventDefault();
      ctx.moveStop(stopId, cur - big);
      return;
    case 'Home':
      event.preventDefault();
      ctx.moveStop(stopId, 0);
      return;
    case 'End':
      event.preventDefault();
      ctx.moveStop(stopId, 1);
      return;
    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      ctx.removeStop(stopId);
      break;
    default:
  }
}
</script>

<template>
  <Primitive
    :as="as"
    :ref="forwardRef"
    role="slider"
    :tabindex="tabindex"
    :aria-label="accessibleLabel"
    :aria-valuemin="0"
    :aria-valuemax="1"
    :aria-valuenow="position"
    :aria-valuetext="valueTextAttr"
    :aria-orientation="'horizontal'"
    :aria-selected="selected || undefined"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-selected="selected ? '' : undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :style="positionStyle"
    @keydown="onKeyDown"
    @focus="onSelect"
    @pointerdown="onSelect"
  >
    <slot
      :stop="stop"
      :index="index"
      :selected="selected"
      :percent="percentage"
      :color="color"
    />
  </Primitive>
</template>
