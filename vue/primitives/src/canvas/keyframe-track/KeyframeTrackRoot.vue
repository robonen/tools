<script lang="ts">
import type { Ref } from 'vue';
import type { PrimitiveProps } from '../../internal/primitive';
import type { Direction } from '../../utilities/config-provider';
import type { KeyframeTrackContext, KeyframeTrackKeyframeData } from './context';

/**
 * Root of the headless keyframe track: animation keyframes laid out on a time
 * axis, each segment carrying an editable cubic-bezier easing. It owns the
 * keyframe array (two-way via `v-model` or uncontrolled via `defaultValue`),
 * builds the time↔pixel projection (its own `useScale` when standalone, or the
 * injected Timeline's scale when nested as a lane), and exposes the live
 * sampler `sampleAt(time)` plus the easing editor binding.
 *
 * Transient drag positions are written to an in-flight overlay and committed on
 * pointerup (`commit`); an external `v-model` write during a gesture is ignored
 * (the `isMutating` early-return) so it never clobbers the live drag — mirroring
 * the Timeline reconcile.
 *
 * Provides `KeyframeTrackContext` to every part: the projection, the shared
 * frame-grid snap engine, the keyframe actions, and the roving-focus registry.
 * When nested in a Timeline it derives `duration` / `fps` from that context and
 * renders as a `listitem`; standalone it measures its own lane and renders as a
 * `group`.
 */
export interface KeyframeTrackRootProps extends PrimitiveProps {
  /** Controlled keyframes (`v-model`). */
  modelValue?: KeyframeTrackKeyframeData[];
  /** Uncontrolled initial keyframes (ignored when `v-model` is bound). @default [] */
  defaultValue?: KeyframeTrackKeyframeData[];
  /** The animated property name (drives the a11y label / value text). */
  property?: string;
  /** Keyframes move vertically to edit `value` (else a single horizontal lane). @default false */
  valueAxis?: boolean;
  /** Value domain `[min, max]` (the y-axis extent in `valueAxis` mode). @default [0, 1] */
  valueRange?: [number, number];
  /**
   * Total track duration in seconds. When omitted it is auto-derived from the
   * keyframes (largest `time`) standalone, or inherited from a Timeline.
   * @default auto
   */
  duration?: number;
  /** Frame rate (timecode + frame snapping + keyboard nudge). @default 30 */
  fps?: number;
  /** Keyboard nudge step in seconds. @default 1/fps */
  step?: number;
  /** Large keyboard step in seconds (Shift+Arrow). @default 10/fps */
  largeStep?: number;
  /** Value-axis keyboard nudge step (per Arrow Up/Down in `valueAxis` mode). @default 0.01 */
  valueStep?: number;
  /** Snap step in seconds (frame grid). @default 1/fps */
  snapStep?: number;
  /** Enable magnetic snapping to the frame grid. @default true */
  snapping?: boolean;
  /** Allow keyframes to overlap in time (else neighbour-clamped to keep order). @default false */
  allowOverlap?: boolean;
  /** Minimum time gap between neighbours (seconds) when `allowOverlap` is false. @default 1/fps */
  minTimeBetween?: number;
  /** Snap radius in pixels. @default 8 */
  snapThresholdPx?: number;
  /** Selected keyframe id (`v-model:selectedId`). */
  selectedId?: string | null;
  /** Disable all interaction. @default false */
  disabled?: boolean;
  /**
   * Writing direction. When omitted it is inherited from the nearest
   * `ConfigProvider` (falling back to `'ltr'`); an explicit value wins.
   */
  dir?: Direction;
}

// `update:*` events are declared by their `defineModel`s and must NOT be
// re-declared here.
export interface KeyframeTrackRootEmits {
  /** Emitted when a keyframe drag / keypress settles, with the affected id. */
  keyframeCommit: [id: string];
}
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, triggerRef, watch } from 'vue';
import { clamp } from '@robonen/stdlib';
import { useElementSize, useForwardExpose, useId } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useDirection } from '../../utilities/config-provider';
import { formatClock, framesToTimecode, secondsToFrames, useScale } from '../../internal/scale';
import { gridTargets, useSnapping } from '../../internal/snapping';
import type { SnapTarget } from '../../internal/snapping';
import { useTimelineContext } from '../timeline/context';
import type { TimelineContext } from '../timeline/context';
import { provideKeyframeTrackContext } from './context';
import { clampKeyframeTime, sampleKeyframes, sortKeyframes } from './utils';

const {
  modelValue,
  defaultValue,
  property,
  valueAxis = false,
  valueRange = [0, 1] as [number, number],
  duration: durationProp,
  fps: fpsProp = 30,
  step: stepProp,
  largeStep: largeStepProp,
  valueStep = 0.01,
  snapStep: snapStepProp,
  snapping = true,
  allowOverlap = false,
  minTimeBetween: minTimeBetweenProp,
  snapThresholdPx = 8,
  selectedId: selectedIdProp,
  disabled = false,
  dir,
  as = 'div',
} = defineProps<KeyframeTrackRootProps>();

const emit = defineEmits<KeyframeTrackRootEmits>();

const trackId = useId(undefined, 'keyframe-track').value;
const localDirection = useDirection(() => dir);

// Optionally nest inside a Timeline: when present, derive duration / fps from it.
// The factory's inject returns the `null` fallback when no Timeline is provided
// (never undefined), so it does not throw; cast keeps the optional null type.
const timeline = useTimelineContext(null as unknown as TimelineContext) as TimelineContext | null;
const inTimeline = timeline !== null;

// ── models (controlled + uncontrolled) ──────────────────────────────────────
const localKeyframes = shallowRef<KeyframeTrackKeyframeData[]>(
  sortKeyframes(modelValue ?? defaultValue ?? []),
);
const model = defineModel<KeyframeTrackKeyframeData[]>('modelValue', {
  get: external => external ?? localKeyframes.value,
  set: (value) => {
    localKeyframes.value = sortKeyframes(value);
    return value;
  },
});

const selectedModel = defineModel<string | null>('selectedId', {
  default: undefined as unknown as string | null,
});
if (selectedModel.value === undefined) selectedModel.value = selectedIdProp ?? null;

// ── transient overlay (in-flight drag) ───────────────────────────────────────
const isMutating = shallowRef(false);
const draggingId = shallowRef<string | null>(null);
// The live working copy: an immutable, sorted array. During a drag this holds
// the transient positions; on commit it is written back to the model.
const working = shallowRef<KeyframeTrackKeyframeData[]>(sortKeyframes(model.value ?? []));

function reconcile(): void {
  // During an active gesture the model array is stale on purpose; don't clobber
  // the live overlay until the gesture commits.
  if (isMutating.value) return;
  working.value = sortKeyframes(model.value ?? []);
}
// `deep: 1` (not full `deep: true`): the component's own writes always replace
// the array AND every element by reference (`candidate.map(k => ({ ...k }))`),
// and external `v-model` writes replace the whole array, so depth-1 (array ref +
// per-index element ref) catches every supported change without the O(n) deep
// walk into each keyframe's nested `value`/`easing` fields on every reconcile.
watch(model, reconcile, { immediate: true, deep: 1 });

const keyframes = computed(() => working.value);

// Memoized id → index over the live keyframes, rebuilt once per change. Parts
// read this for O(1) lookup instead of scanning the array (find/findIndex) per
// part per frame — keeps the whole-track per-frame cost O(n) rather than O(n²).
const indexById = computed(() => {
  const m = new Map<string, number>();
  const list = working.value;
  for (let i = 0; i < list.length; i++) m.set(list[i]!.id, i);
  return m;
});

// ── reactive prop refs ───────────────────────────────────────────────────────
const fps = toRef(() => fpsProp);
const frameStep = computed(() => (fpsProp > 0 ? 1 / fpsProp : 1));
const step = computed(() => (stepProp !== undefined && stepProp > 0 ? stepProp : frameStep.value));
const largeStep = computed(() => (largeStepProp !== undefined && largeStepProp > 0 ? largeStepProp : frameStep.value * 10));
const snapStep = computed(() => (snapStepProp !== undefined && snapStepProp > 0 ? snapStepProp : frameStep.value));
const minTimeBetween = computed(() => (minTimeBetweenProp !== undefined ? minTimeBetweenProp : frameStep.value));

// When nested, the Timeline owns direction / fps; standalone uses our own.
const direction = computed(() => (inTimeline ? timeline!.direction.value : localDirection.value));
const effectiveFps = computed(() => (inTimeline ? timeline!.fps.value : fpsProp));

// ── duration ─────────────────────────────────────────────────────────────────
const duration = computed(() => {
  if (durationProp !== undefined && durationProp > 0) return durationProp;
  if (inTimeline) return timeline!.duration.value;
  let max = 0;
  for (const k of working.value) if (k.time > max) max = k.time;
  // A non-zero floor so a single keyframe still has a projectable range.
  return max > 0 ? max : 1;
});

// ── element measurement (standalone) ─────────────────────────────────────────
const rootEl = shallowRef<HTMLElement | null>(null);
const { width: measuredWidth, height: measuredHeight } = useElementSize(rootEl);

const laneWidth = computed(() => {
  if (inTimeline) return timeline!.viewportWidth.value;
  return measuredWidth.value;
});
const laneHeight = computed(() => measuredHeight.value);

// ── coordinate model ─────────────────────────────────────────────────────────
const isRtl = computed(() => direction.value === 'rtl');

// Standalone time scale: domain [0, duration] → range [0, laneWidth].
const localScale = useScale({
  domain: () => [0, duration.value] as const,
  range: () => [0, measuredWidth.value] as const,
  rtl: () => isRtl.value,
  tickKind: 'none',
});

function projection(seconds: number): number {
  if (inTimeline) return timeline!.scale(seconds);
  if (measuredWidth.value <= 0) return 0;
  return localScale.scale(seconds);
}

function invert(px: number): number {
  if (inTimeline) return timeline!.invert(px);
  if (measuredWidth.value <= 0) return 0;
  return localScale.invert(px);
}

// Value y-axis (value-up): valueRange[0] → bottom (laneHeight), valueRange[1] → top (0).
const valueScale = useScale({
  domain: () => valueRange,
  range: () => [0, laneHeight.value] as const,
  orientation: 'vertical',
  clamp: true,
});

function projectValue(value: number): number {
  if (laneHeight.value <= 0) return 0;
  return valueScale.scale(value);
}

function invertValue(px: number): number {
  if (laneHeight.value <= 0) return valueRange[0];
  return valueScale.invert(px);
}

// ── formatting ─────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  // Inside a Timeline match its timecode; standalone use a wall-clock string,
  // unless a sub-second frame resolution is meaningful.
  if (inTimeline) return timeline!.formatTimecode(seconds);
  if (effectiveFps.value > 0) return framesToTimecode(secondsToFrames(seconds, effectiveFps.value), effectiveFps.value);
  return formatClock(seconds);
}

// ── snap engine (frame grid) ─────────────────────────────────────────────────
const snapTargets = computed<SnapTarget[]>(() => {
  if (!snapping || laneWidth.value <= 0) return [];
  const lo = inTimeline ? timeline!.invert(0) : 0;
  const hi = inTimeline ? timeline!.invert(laneWidth.value) : duration.value;
  return gridTargets(Math.min(lo, hi), Math.max(lo, hi), snapStep.value, projection, 'x');
});

const snapEngine = useSnapping({
  enabled: () => snapping && !disabled && laneWidth.value > 0,
  thresholdPx: () => snapThresholdPx,
  // '1d' uses every target as a single pool with no per-call filter. All
  // `snapTargets` are produced by `gridTargets(..., 'x')`, so they are already
  // x-axis only — '1d' is behaviour-equivalent to 'x' here but skips the
  // `allTargets.filter(t => t.axis === 'x')` allocation on every snap1d() call.
  axis: '1d',
  project: (value: number) => projection(value),
  targets: () => snapTargets.value,
});

function snapTime(seconds: number, exclude?: string): number {
  if (!snapping || disabled || laneWidth.value <= 0) return seconds;
  return snapEngine.snap1d(seconds, exclude !== undefined ? { exclude } : undefined).value;
}

// ── sampling ─────────────────────────────────────────────────────────────────
function sampleAt(time: number): number {
  return sampleKeyframes(working.value, time, valueRange);
}

/** Sample the value curve into `samples` evenly-spaced points across the duration. */
function getValueCurve(samples = 64): Array<{ time: number; value: number }> {
  const out: Array<{ time: number; value: number }> = [];
  const total = duration.value;
  if (samples < 2 || total <= 0) return out;
  for (let i = 0; i < samples; i++) {
    const time = (i / (samples - 1)) * total;
    out.push({ time, value: sampleAt(time) });
  }
  return out;
}

// ── selection ─────────────────────────────────────────────────────────────────
function select(id: string | null): void {
  if (disabled) return;
  if (selectedModel.value === id) return;
  selectedModel.value = id;
}

// External selection writes are honoured (not blocked by mutation).
watch(() => selectedIdProp, (id) => {
  if (id !== undefined && id !== selectedModel.value) selectedModel.value = id;
});

// ── mutation ────────────────────────────────────────────────────────────────
const dirtyIds = new Set<string>();

/** Write the working overlay (sorted, immutable) and flag the touched id dirty. */
function setKeyframes(next: KeyframeTrackKeyframeData[], dirtyId?: string): void {
  working.value = sortKeyframes(next);
  if (dirtyId !== undefined) dirtyIds.add(dirtyId);
  triggerRef(working);
}

function indexOf(id: string): number {
  const list = working.value;
  for (let i = 0; i < list.length; i++) if (list[i]!.id === id) return i;
  return -1;
}

function addKeyframe(time: number, value?: number): string | undefined {
  if (disabled) return undefined;
  const t = clamp(time, 0, duration.value || Number.MAX_SAFE_INTEGER);
  const v = value ?? sampleAt(t);
  const id = `${trackId}-kf-${idCounter++}`;
  const next: KeyframeTrackKeyframeData = { id, time: t, value: v };
  const candidate = sortKeyframes([...working.value, next]);
  working.value = candidate;
  // A keyframe add is a single committed mutation.
  model.value = candidate.map(k => ({ ...k }));
  emit('keyframeCommit', id);
  return id;
}

function removeKeyframe(id: string): void {
  if (disabled) return;
  const candidate = working.value.filter(k => k.id !== id);
  if (candidate.length === working.value.length) return;
  working.value = candidate;
  model.value = candidate.map(k => ({ ...k }));
  if (selectedModel.value === id) selectedModel.value = null;
  emit('keyframeCommit', id);
}

function moveKeyframe(id: string, time: number, value?: number, mutating = false): void {
  if (disabled) return;
  const index = indexOf(id);
  if (index === -1) return;
  const current = working.value[index]!;
  isMutating.value = mutating;
  draggingId.value = mutating ? id : draggingId.value;

  const t = clampKeyframeTime(working.value, index, time, {
    allowOverlap,
    minTimeBetween: minTimeBetween.value,
    duration: duration.value,
  });
  let v = current.value;
  if (value !== undefined) v = clamp(value, Math.min(valueRange[0], valueRange[1]), Math.max(valueRange[0], valueRange[1]));

  // Unchanged frame: the drag state was already set above; nothing to write.
  if (t === current.time && v === current.value) return;

  const candidate = working.value.slice();
  candidate[index] = { ...current, time: t, value: v };
  setKeyframes(candidate, id);

  // A non-mutating move is an immediate commit (keyboard nudge).
  if (!mutating) commit();
}

function setEasing(id: string, bezier: [number, number, number, number]): void {
  if (disabled) return;
  const index = indexOf(id);
  if (index === -1) return;
  const current = working.value[index]!;
  const candidate = working.value.slice();
  candidate[index] = { ...current, easing: bezier };
  working.value = candidate;
  triggerRef(working);
  model.value = candidate.map(k => ({ ...k }));
  emit('keyframeCommit', id);
}

function commit(): void {
  const wasMutating = isMutating.value;
  isMutating.value = false;
  draggingId.value = null;
  if (dirtyIds.size === 0 && !wasMutating) return;
  const ids = [...dirtyIds];
  dirtyIds.clear();
  if (ids.length === 0) return;
  // Write the model immutably from the working overlay.
  model.value = working.value.map(k => ({ ...k }));
  for (const id of ids) emit('keyframeCommit', id);
}

let idCounter = working.value.length;

// ── roving focus ─────────────────────────────────────────────────────────────
const keyframeEls = new Map<string, HTMLElement>();
function registerKeyframeEl(id: string, el: HTMLElement | null): void {
  if (el) keyframeEls.set(id, el);
  else keyframeEls.delete(id);
}

function focusKeyframe(id: string): void {
  keyframeEls.get(id)?.focus();
}

function focusAdjacent(fromId: string, dirSign: 1 | -1): void {
  const order = working.value;
  const idx = order.findIndex(k => k.id === fromId);
  if (idx === -1) return;
  const nextIdx = idx + dirSign;
  if (nextIdx < 0 || nextIdx >= order.length) return;
  focusKeyframe(order[nextIdx]!.id);
}

// ── a11y ──────────────────────────────────────────────────────────────────────
const ariaLabel = computed(() => (property ? `${property} keyframes` : undefined));

// ── provide ────────────────────────────────────────────────────────────────────
const context: KeyframeTrackContext = {
  trackId,
  keyframes,
  indexById,
  selectedId: selectedModel as Ref<string | null>,
  property: toRef(() => property),
  valueAxis: toRef(() => valueAxis),
  valueRange: toRef(() => valueRange),
  duration,
  fps,
  step,
  largeStep,
  valueStep: toRef(() => valueStep),
  allowOverlap: toRef(() => allowOverlap),
  minTimeBetween,
  snapping: toRef(() => snapping),
  disabled: toRef(() => disabled),
  direction,
  laneWidth,
  laneHeight,
  projection,
  invert,
  projectValue,
  invertValue,
  formatTime,
  snapTime,
  snapEngine,
  isMutating,
  draggingId,
  inTimeline,
  sampleAt,
  select,
  addKeyframe,
  removeKeyframe,
  moveKeyframe,
  setEasing,
  commit,
  registerKeyframeEl,
  focusAdjacent,
  focusKeyframe,
};
provideKeyframeTrackContext(context);

defineExpose({
  sampleAt,
  getValueCurve,
  addKeyframe,
  removeKeyframe,
  moveKeyframe,
  setEasing,
  select,
  keyframes,
  projection,
  invert,
});

// `useForwardExpose` runs AFTER `defineExpose` so it merges the prior bindings
// (plus props + `$el`) instead of clobbering them.
const { forwardRef } = useForwardExpose();

function setRootRef(el: unknown): void {
  forwardRef(el as never);
  rootEl.value = (el && typeof el === 'object' && '$el' in el ? (el as { $el: HTMLElement }).$el : el) as HTMLElement | null;
}
</script>

<template>
  <Primitive
    :ref="setRootRef"
    :as="as"
    :role="inTimeline ? 'listitem' : 'group'"
    aria-roledescription="keyframe track"
    :aria-label="ariaLabel"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-value-axis="valueAxis ? '' : undefined"
    :data-in-timeline="inTimeline ? '' : undefined"
    :data-mutating="isMutating ? '' : undefined"
    data-orientation="horizontal"
    :dir="direction"
  >
    <slot
      :keyframes="keyframes"
      :selected-id="selectedModel"
      :duration="duration"
      :projection="projection"
      :sample-at="sampleAt"
    />
  </Primitive>
</template>
