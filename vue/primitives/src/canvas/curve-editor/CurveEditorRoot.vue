<script lang="ts">
import type { CurveEditorAnchor, CurveEditorChannel, CurveEditorDirection, CurveEditorHandleSide, CurveEditorInterpolation } from './context';
import type { Point } from '../../internal/utils/geometry';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A headless control-point curve editor: a draggable set of anchors defining a
 * single-valued `y = f(x)` curve. It backs both **animation easing curves** (an
 * ease over normalized time) and **photo tone curves** (per-RGB-channel output
 * remapping), and is the shared engine reused by Levels (gamma) and the future
 * KeyframeTrack.
 *
 * The root owns the anchor array (controlled via `v-model`, uncontrolled via
 * `defaultValue`), builds value↔pixel projections for both axes (`useScale`,
 * y-axis value-up), and exposes the live evaluator: `sample(x) → y` and
 * `toLUT(size)` for applying the curve to pixels. With `monotonicX` (the
 * default) anchors are neighbour-clamped so they can never cross in x — easing
 * and tone curves both require a function of x. `fixedEndpoints` locks the first
 * and last anchor in x. The `interpolation` mode selects monotone (default),
 * linear, catmull-rom, or per-anchor bezier handles.
 *
 * Provides context to `CurveEditorGrid`, `CurveEditorCurve`, `CurveEditorPoint`,
 * and `CurveEditorHandle`. The `channel` prop only tags which curve is being
 * edited (for styling / the `#channel` slot); consumers render their own RGB
 * tabs.
 */
export interface CurveEditorRootProps extends PrimitiveProps {
  /** Uncontrolled initial anchors. Seeds the curve when `v-model` is absent. */
  defaultValue?: CurveEditorAnchor[];
  /**
   * How the curve is interpolated between anchors.
   * @default 'monotone'
   */
  interpolation?: CurveEditorInterpolation;
  /** Input (x) domain `[min, max]`. @default [0, 1] */
  domainX?: readonly [number, number];
  /** Output (y) domain `[min, max]`. @default [0, 1] */
  domainY?: readonly [number, number];
  /**
   * Keep x single-valued: neighbour-clamp anchors so they can't cross in x.
   * Easing / tone curves require a function of x. @default true
   */
  monotonicX?: boolean;
  /** Lock the first and last anchor in x (only y is editable). @default true */
  fixedEndpoints?: boolean;
  /**
   * Tags which curve is being edited (composite `'value'` or per-channel
   * `'r'`/`'g'`/`'b'`). Purely cosmetic — exposed for styling / the `#channel`
   * slot; consumers render their own channel tabs. @default 'value'
   */
  channel?: CurveEditorChannel;
  /** Keyboard step for x/y nudges. @default 0.01 */
  step?: number;
  /** Large keyboard step (Shift+Arrow / Page keys). @default 0.1 */
  largeStep?: number;
  /** Sample count for the rendered polyline / LUT. @default 256 */
  samples?: number;
  /** Disable all interaction. @default false */
  disabled?: boolean;
  /** Writing direction (inherited from `ConfigProvider` when omitted). */
  dir?: CurveEditorDirection;
}

export interface CurveEditorRootEmits {
  /** Fired after a drag or keypress settles (anchor added / removed / moved). */
  anchorsCommit: [anchors: CurveEditorAnchor[]];
  /** Fired when an anchor is added. */
  anchorAdd: [anchor: CurveEditorAnchor];
  /** Fired when an anchor is removed. */
  anchorRemove: [anchor: CurveEditorAnchor];
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { provideCurveEditorContext } from './context';
import { useScale } from '../../internal/scale';
import { useDirection, useId } from '../../utilities/config-provider';
import { useForwardExpose } from '@robonen/vue';
import { buildEvaluator, clampAnchorX, clampAnchorY, sortAnchors } from './utils';
import { toLUT as splineToLUT } from '../../internal/spline';

const {
  defaultValue,
  interpolation = 'monotone',
  domainX = [0, 1] as readonly [number, number],
  domainY = [0, 1] as readonly [number, number],
  monotonicX = true,
  fixedEndpoints = true,
  channel = 'value',
  step = 0.01,
  largeStep = 0.1,
  samples = 256,
  disabled = false,
  dir,
  as = 'div',
} = defineProps<CurveEditorRootProps>();

const direction = useDirection(() => dir);
const emit = defineEmits<CurveEditorRootEmits>();
const idBase = useId();

const model = defineModel<CurveEditorAnchor[] | null>();

/** Default curve: a straight identity line across the domain (two endpoints). */
function defaultAnchors(): CurveEditorAnchor[] {
  const [x0, x1] = domainX;
  const [y0, y1] = domainY;
  return [
    { id: `${idBase.value}-0`, x: x0, y: y0 },
    { id: `${idBase.value}-1`, x: x1, y: y1 },
  ];
}

function seedAnchors(): CurveEditorAnchor[] {
  const seed = Array.isArray(model.value) && model.value.length > 0
    ? model.value
    : Array.isArray(defaultValue) && defaultValue.length > 0
      ? defaultValue
      : defaultAnchors();
  return sortAnchors(seed);
}

// `shallowRef` — the array is replaced wholesale on every mutation; items are
// plain (non-proxied) so the evaluator/render path reads them cheaply.
const localAnchors = shallowRef<CurveEditorAnchor[]>(seedAnchors());

watch(model, (v) => {
  if (v === null || v === undefined) return;
  if (v === localAnchors.value) return;
  localAnchors.value = sortAnchors(v);
});

const anchors = computed<CurveEditorAnchor[]>({
  get: () => localAnchors.value,
  set: (v) => {
    const sorted = sortAnchors(v);
    localAnchors.value = sorted;
    model.value = sorted;
  },
});

// Auto-incrementing id seed for inserted anchors (stable across the session).
let idCounter = localAnchors.value.length;
function nextId(): string {
  return `${idBase.value}-${idCounter++}`;
}

// ── geometry / projections ────────────────────────────────────────────────
// Plot size in pixels; measured from the root element after mount. Degenerate
// `[n, n]` ranges (zero-size pre-mount) are guarded by `scaleLinear` (returns
// range start), so projections never NaN.
const plotWidth = shallowRef(0);
const plotHeight = shallowRef(0);

const scaleX = useScale({
  domain: () => domainX,
  range: () => [0, plotWidth.value] as const,
  orientation: 'horizontal',
  clamp: true,
});

// y-axis is value-UP: domain start maps to the bottom (range end).
const scaleY = useScale({
  domain: () => domainY,
  range: () => [0, plotHeight.value] as const,
  orientation: 'vertical',
  clamp: true,
});

// ── evaluator ─────────────────────────────────────────────────────────────
const evaluator = computed(() => buildEvaluator(localAnchors.value, interpolation));

function sample(x: number): number {
  return evaluator.value(x);
}

function toLUT(size: number = samples): number[] {
  const [x0, x1] = domainX;
  return splineToLUT(evaluator.value, size, x0, x1);
}

// ── roving focus ──────────────────────────────────────────────────────────
const activeIndex = ref(0);
const anchorEls = new Map<string, HTMLElement | null>();

function registerAnchorEl(id: string, el: HTMLElement | null): void {
  if (el) anchorEls.set(id, el);
  else anchorEls.delete(id);
}

// id → index map, rebuilt once per `localAnchors` replacement. Parts derive
// their `index`/`isEndpoint` from this O(1) lookup instead of each re-scanning
// the wholesale-replaced array every drag frame (was O(n) per part → O(n^2)
// across the list per committed frame).
const indexById = computed(() => {
  const list = localAnchors.value;
  const map = new Map<string, number>();
  for (let i = 0; i < list.length; i++) map.set(list[i]!.id, i);
  return map;
});

function indexOf(id: string): number {
  return indexById.value.get(id) ?? -1;
}

function isEndpoint(id: string): boolean {
  const i = indexById.value.get(id) ?? -1;
  return i === 0 || i === localAnchors.value.length - 1;
}

function focusIndex(index: number): void {
  const anchor = localAnchors.value[index];
  if (!anchor) return;
  anchorEls.get(anchor.id)?.focus();
}

function setActiveIndex(index: number): void {
  const count = localAnchors.value.length;
  if (count === 0) return;
  const clamped = Math.min(Math.max(index, 0), count - 1);
  activeIndex.value = clamped;
  focusIndex(clamped);
}

function moveFocus(delta: number): void {
  const count = localAnchors.value.length;
  if (count === 0) return;
  const next = ((activeIndex.value + delta) % count + count) % count;
  setActiveIndex(next);
}

// Keep the active index valid as anchors are added/removed.
watch(() => localAnchors.value.length, (count) => {
  if (count === 0) {
    activeIndex.value = 0;
    return;
  }
  if (activeIndex.value > count - 1) activeIndex.value = count - 1;
});

// ── mutations ─────────────────────────────────────────────────────────────
const minGap = computed(() => Math.max(step, (Math.abs(domainX[1] - domainX[0])) * 1e-3));

function commit(): void {
  emit('anchorsCommit', localAnchors.value.map(a => ({ ...a })));
}

// Returns whether the anchor actually moved. The live update is decoupled from
// the `anchorsCommit` emit: callers commit on settle (drag end / keypress), not
// per frame. Returning the changed-flag lets discrete callers (keyboard) skip
// committing on a clamped no-op, matching the original "only emit on change".
function updateAnchor(id: string, next: { x?: number; y?: number }): boolean {
  if (disabled) return false;
  const list = localAnchors.value;
  const index = indexOf(id);
  if (index === -1) return false;
  const current = list[index]!;

  let x = current.x;
  if (next.x !== undefined) {
    x = clampAnchorX(list, index, next.x, {
      domainMin: domainX[0],
      domainMax: domainX[1],
      monotonicX,
      fixedEndpoints,
      minGap: minGap.value,
    });
  }
  let y = current.y;
  if (next.y !== undefined)
    y = clampAnchorY(next.y, domainY[0], domainY[1]);

  if (x === current.x && y === current.y) return false;

  const candidate = list.slice();
  candidate[index] = { ...current, x, y };
  // x never crosses a neighbour (clampAnchorX guarantees it under monotonicX),
  // so order is preserved without a re-sort. Re-sort defensively when monotonicX
  // is off (anchors may legitimately reorder).
  anchors.value = monotonicX ? candidate : sortAnchors(candidate);
  // Track the moved anchor's new index for roving focus.
  activeIndex.value = indexOf(id);
  return true;
}

function updateHandle(id: string, side: CurveEditorHandleSide, handle: Point): void {
  if (disabled || interpolation !== 'bezier') return;
  const list = localAnchors.value;
  const index = indexOf(id);
  if (index === -1) return;
  const current = list[index]!;

  // Easing requires the segment stay monotone in x: clamp the tangent so its
  // x-component never points "backwards" past the adjacent anchor (dx >= 0).
  const clamped = clampHandle(list, index, side, handle);

  const candidate = list.slice();
  candidate[index] = side === 'in'
    ? { ...current, inHandle: clamped }
    : { ...current, outHandle: clamped };
  anchors.value = candidate;
  // Live update only; the handle drag commits once on settle (see onCommit).
}

/**
 * Clamp a bezier tangent so the cubic segment stays single-valued in x
 * (`dx >= 0`): the outgoing handle may not reach past the next anchor, the
 * incoming handle may not reach before the previous anchor. Prevents the
 * S-fold that would make the easing curve multi-valued.
 */
function clampHandle(list: readonly CurveEditorAnchor[], index: number, side: CurveEditorHandleSide, handle: Point): Point {
  if (!monotonicX) return handle;
  const current = list[index]!;
  if (side === 'out') {
    const next = list[index + 1];
    const maxDx = next ? next.x - current.x : domainX[1] - current.x;
    return { x: Math.min(Math.max(handle.x, 0), Math.max(0, maxDx)), y: handle.y };
  }
  const prev = list[index - 1];
  const minDx = prev ? prev.x - current.x : domainX[0] - current.x;
  return { x: Math.max(Math.min(handle.x, 0), Math.min(0, minDx)), y: handle.y };
}

function addAnchor(x: number, y?: number): string | undefined {
  if (disabled) return undefined;
  const lo = Math.min(domainX[0], domainX[1]);
  const hi = Math.max(domainX[0], domainX[1]);
  const cx = Math.min(Math.max(x, lo), hi);
  const cy = clampAnchorY(y ?? sample(cx), domainY[0], domainY[1]);
  const id = nextId();
  const anchor: CurveEditorAnchor = { id, x: cx, y: cy };
  const candidate = sortAnchors([...localAnchors.value, anchor]);
  anchors.value = candidate;
  setActiveIndex(indexOf(id));
  emit('anchorAdd', { ...anchor });
  commit();
  return id;
}

function removeAnchor(id: string): void {
  if (disabled) return;
  if (isEndpoint(id)) return;
  const index = indexOf(id);
  if (index === -1) return;
  const removed = localAnchors.value[index]!;
  const candidate = localAnchors.value.slice();
  candidate.splice(index, 1);
  anchors.value = candidate;
  setActiveIndex(Math.min(index, candidate.length - 1));
  emit('anchorRemove', { ...removed });
  commit();
}

provideCurveEditorContext({
  anchors,
  interpolation: toRef(() => interpolation),
  domainX: toRef(() => domainX),
  domainY: toRef(() => domainY),
  scaleX,
  scaleY,
  channel: toRef(() => channel),
  step: toRef(() => step),
  largeStep: toRef(() => largeStep),
  monotonicX: toRef(() => monotonicX),
  fixedEndpoints: toRef(() => fixedEndpoints),
  direction,
  disabled: toRef(() => disabled),
  activeIndex,
  sample,
  toLUT,
  indexOf,
  registerAnchorEl,
  isEndpoint,
  setActiveIndex,
  moveFocus,
  commit,
  updateAnchor,
  updateHandle,
  addAnchor,
  removeAnchor,
});

defineExpose({ sample, toLUT, anchors, addAnchor, removeAnchor });

// `useForwardExpose` runs AFTER `defineExpose` so it merges the prior bindings
// (plus props + `$el`) instead of clobbering them.
const { forwardRef, currentElement } = useForwardExpose();

// Measure the plot box once the root element resolves, and on resize.
watch(currentElement, (node, _prev, onCleanup) => {
  if (!node) return;
  const measure = (): void => {
    const rect = node.getBoundingClientRect();
    plotWidth.value = rect.width;
    plotHeight.value = rect.height;
  };
  measure();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    // Disconnect on unmount AND before the next run (currentElement change).
    // Without this each re-run stacks a new observer and the last one leaks,
    // retaining the root node + the measure closure (+ this component scope).
    onCleanup(() => ro.disconnect());
  }
}, { immediate: false });
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :dir="direction"
    :data-channel="channel"
    :data-interpolation="interpolation"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
  >
    <slot
      :anchors="anchors"
      :channel="channel"
      :interpolation="interpolation"
      :sample="sample"
    />
  </Primitive>
</template>
