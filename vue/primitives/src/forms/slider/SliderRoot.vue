<script lang="ts">
import type { SliderDirection, SliderOrientation, SliderThumbAlignment, SliderValueText } from './context';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * An accessible slider for picking one or more numeric values from a range by
 * dragging a thumb along a track or using the keyboard. The root owns the value
 * state (controlled via `v-model` or uncontrolled via `defaultValue`), snaps to
 * `step`, clamps to `min`/`max`, and handles pointer drags, focus, and arrow /
 * Page / Home / End keys. Pass multiple values for a range (multi-thumb) slider
 * and keep thumbs apart with `minStepsBetweenThumbs`; supports horizontal and
 * vertical `orientation`, `dir`/`inverted` direction, and emits `valueCommit`
 * when a drag or keypress settles. It provides context to `SliderTrack`,
 * `SliderRange`, and `SliderThumb`, and renders hidden form inputs when `name`
 * is set. Reach for it whenever a user should choose a value within known bounds
 * (volume, price range, brightness).
 */
export interface SliderRootProps extends PrimitiveProps {
  /** Min value. @default 0 */
  min?: number;
  /** Max value. @default 100 */
  max?: number;
  /** Step granularity. @default 1 */
  step?: number;
  /** Minimum step count between adjacent thumbs in range mode. @default 0 */
  minStepsBetweenThumbs?: number;
  /** Orientation. @default 'horizontal' */
  orientation?: SliderOrientation;
  /**
   * Writing direction. When omitted it is inherited from the nearest
   * `ConfigProvider` (falling back to `'ltr'`); an explicit value wins.
   */
  dir?: SliderDirection;
  /** Invert the direction of interaction. @default false */
  inverted?: boolean;
  /** Disable all interaction. */
  disabled?: boolean;
  /** Uncontrolled initial value(s). Accepts single number or array. */
  defaultValue?: number | number[];
  /** Hidden input `name` attribute. */
  name?: string;
  /** Mark hidden inputs as required. */
  required?: boolean;
  /**
   * Thumb positioning strategy.
   * - `'overflow'` (default): thumbs are positioned purely by percentage and
   *   may overflow the track at the extremes (offset via CSS if needed).
   * - `'contain'`: thumbs are inset so they stay fully within the track.
   * @default 'overflow'
   */
  thumbAlignment?: SliderThumbAlignment;
  /**
   * Multiplier applied to `step` for large jumps (Page Up/Down and
   * Shift+Arrow). @default 10
   */
  largeStep?: number;
  /**
   * Optional formatter producing a human-friendly `aria-valuetext` for each
   * thumb. Receives the raw value and its thumb index.
   */
  valueText?: SliderValueText;
}

export interface SliderRootEmits {
  valueCommit: [value: number[]];
}
</script>

<script setup lang="ts">
import {
  getClosestValueIndex,
  getStepDecimals,
  hasMinStepsBetweenSortedValues,
  roundToStep,
  scaleLinear,
} from './utils';
import { computed, nextTick, onScopeDispose, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { provideSliderContext } from './context';
import { useDirection } from '../../utilities/config-provider';
import { useForwardExpose } from '@robonen/vue';
import { clamp } from '@robonen/stdlib';

const {
  min = 0,
  max = 100,
  step = 1,
  minStepsBetweenThumbs = 0,
  orientation = 'horizontal',
  dir,
  inverted = false,
  disabled = false,
  defaultValue,
  name,
  required,
  thumbAlignment = 'overflow',
  largeStep = 10,
  valueText,
  as = 'span',
} = defineProps<SliderRootProps>();

// Resolve direction: explicit `dir` prop wins, otherwise inherit from the
// nearest `ConfigProvider` (falls back to `'ltr'`).
const direction = useDirection(() => dir);

const emit = defineEmits<SliderRootEmits>();

// `defineModel` drives both controlled (`v-model`) and uncontrolled modes; in
// uncontrolled mode `model.value` is `undefined` until first write, so the
// internal `localValues` below seeds from `defaultValue`/`min`. `null` is
// accepted (and treated like "no value") for parity with controllers that
// reset by binding `null`.
const model = defineModel<number[] | null>();

function toArray(v: number | number[] | null | undefined): number[] {
  if (Array.isArray(v)) return v.slice();
  if (typeof v === 'number') return [v];
  return [];
}

const seed = Array.isArray(model.value) ? model.value.slice() : toArray(defaultValue);
// `shallowRef` — the array is always replaced wholesale; no need to proxy items.
const localValues = shallowRef<number[]>(seed.length > 0 ? seed : [min]);

// Cache decimals per `step` — `String(step).split('.')` out of the pointermove path.
let stepDecimals = getStepDecimals(step);
watch(() => step, (s) => {
  stepDecimals = getStepDecimals(s);
});

watch(model, (v) => {
  if (v === null || v === undefined) return;
  // Ref-level check is enough; the setter below guards on deep equality again.
  if (v === localValues.value) return;
  localValues.value = v.slice();
});

const values = computed<number[]>({
  get: () => localValues.value,
  set: (v) => {
    localValues.value = v;
    // `defineModel` emits `update:modelValue` on write — no manual emit needed.
    model.value = v;
  },
});

const trackRef = shallowRef<HTMLElement | null>(null);
const thumbEls: HTMLElement[] = [];

function registerThumb(el: HTMLElement): number {
  const existing = thumbEls.indexOf(el);
  if (existing !== -1) return existing;
  thumbEls.push(el);
  return thumbEls.length - 1;
}
function unregisterThumb(el: HTMLElement): void {
  const i = thumbEls.indexOf(el);
  if (i !== -1) thumbEls.splice(i, 1);
}
function getThumbIndex(el: HTMLElement): number {
  return thumbEls.indexOf(el);
}

function setValue(next: number[]): void {
  const prev = localValues.value;
  if (prev.length === next.length) {
    let equal = true;
    for (let i = 0; i < next.length; i++) {
      if (prev[i] !== next[i]) {
        equal = false;
        break;
      }
    }
    if (equal) return;
  }
  values.value = next;
}

function commit(): void {
  emit('valueCommit', localValues.value.slice());
}

function updateValue(index: number, raw: number): void {
  if (disabled) return;
  const prev = localValues.value;
  // Snap to step & clamp to bounds.
  let v = clamp(roundToStep(raw, step, min, stepDecimals), min, max);
  // Clamp to neighbours (prev/next) to preserve sort order & minStepsBetweenThumbs.
  const minGap = minStepsBetweenThumbs * step;
  const prevVal = prev[index - 1];
  const nextVal = prev[index + 1];
  if (prevVal !== undefined) v = Math.max(v, prevVal + minGap);
  if (nextVal !== undefined) v = Math.min(v, nextVal - minGap);
  v = clamp(v, min, max);
  if (v === prev[index]) return;
  // Single allocation: copy + assign. Sort order is preserved by neighbour-clamp.
  const candidate = prev.slice();
  candidate[index] = v;
  if (!hasMinStepsBetweenSortedValues(candidate, minStepsBetweenThumbs, step)) return;
  setValue(candidate);
}

function getValueFromPointer(event: PointerEvent): number {
  const track = trackRef.value;
  if (!track) return min;
  const rect = track.getBoundingClientRect();
  const horizontal = orientation === 'horizontal';
  const size = horizontal ? rect.width : rect.height;
  if (size === 0) return min;
  let offset = horizontal ? event.clientX - rect.left : event.clientY - rect.top;
  // ltr horizontal: left = min. rtl or inverted flip.
  // For vertical we invert by default (top = max visually); `inverted` flips back.
  const flip = (horizontal ? direction.value === 'rtl' : true) !== inverted;
  if (flip) offset = size - offset;
  return scaleLinear(offset, 0, size, min, max);
}

let activeIndex = -1;

function handlePointerMove(event: PointerEvent): void {
  if (activeIndex === -1) return;
  updateValue(activeIndex, getValueFromPointer(event));
}

// Single teardown for the gesture-scoped window listeners, shared by pointerup,
// pointercancel and scope-dispose so none of them can strand the others.
function stopDrag(): void {
  activeIndex = -1;
  globalThis.removeEventListener('pointermove', handlePointerMove);
  globalThis.removeEventListener('pointerup', handlePointerUp);
  globalThis.removeEventListener('pointercancel', handlePointerCancel);
}

function handlePointerUp(): void {
  if (activeIndex === -1) return;
  stopDrag();
  commit();
}

// Without this, an OS-interrupted gesture (touch cancelled, lost pointer capture,
// context menu, scroll takeover) never fires pointerup: the window listeners stay
// attached and `activeIndex` stays pinned to a stale thumb. Abort with no commit
// (the live value already reflects the last committed move).
function handlePointerCancel(): void {
  if (activeIndex === -1) return;
  stopDrag();
}

function startDragFromTrack(event: PointerEvent): void {
  if (disabled) return;
  const raw = getValueFromPointer(event);
  const index = getClosestValueIndex(localValues.value, raw);
  activeIndex = index;
  updateValue(index, raw);
  // Focus the thumb we just grabbed.
  nextTick(() => thumbEls[index]?.focus());
  globalThis.addEventListener('pointermove', handlePointerMove);
  globalThis.addEventListener('pointerup', handlePointerUp);
  globalThis.addEventListener('pointercancel', handlePointerCancel);
}

// A mid-drag unmount (slider removed while a thumb is held) would otherwise leak
// the window listeners, which retain this instance via their closures.
onScopeDispose(stopDrag);

// Drag is initiated on the ROOT, not the track: thumbs are siblings of the
// track (the standard anatomy), so a press on a thumb does NOT bubble to the
// track — it bubbles here. Handling it on the root drags whether the press
// lands on the track, the range, or a thumb.
function onRootPointerDown(event: PointerEvent): void {
  if (disabled || event.button !== 0) return;
  event.preventDefault();
  (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  startDragFromTrack(event);
}

// Keep values clamped if bounds change.
watch([() => min, () => max], ([nmin, nmax]) => {
  const cur = localValues.value;
  // Packed array: push into `[]` rather than `new Array(n)` (holey SMI → can't
  // transition back). Small array, V8 keeps it PACKED_DOUBLE/SMI_ELEMENTS.
  const clamped: number[] = [];
  let changed = false;
  for (let i = 0; i < cur.length; i++) {
    const c = clamp(cur[i]!, nmin, nmax);
    clamped.push(c);
    if (c !== cur[i]) changed = true;
  }
  if (changed) setValue(clamped);
});

function contextUpdateValue(i: number, v: number): void {
  updateValue(i, v);
  commit();
}

provideSliderContext({
  values,
  // `toRef(() => prop)` → `GetterRefImpl`: reactive `Ref` without a
  // `ReactiveEffect`/cache, since these are identity passthroughs.
  min: toRef(() => min),
  max: toRef(() => max),
  step: toRef(() => step),
  orientation: toRef(() => orientation),
  // `direction` is already a `ComputedRef<SliderDirection>` from `useDirection`.
  direction,
  disabled: toRef(() => disabled),
  inverted: toRef(() => inverted),
  thumbAlignment: toRef(() => thumbAlignment),
  valueText: toRef(() => valueText),
  largeStepMultiplier: toRef(() => largeStep),
  trackRef,
  registerThumb,
  unregisterThumb,
  getThumbIndex,
  updateValue: contextUpdateValue,
  startDragFromTrack,
});

defineExpose({ values });

// `useForwardExpose` runs AFTER `defineExpose` so the composable merges the
// prior expose bindings (plus props + `$el`) instead of `defineExpose`'s
// `expose()` clobbering them and warning "expose() should be called only once".
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-orientation="orientation"
    :dir="direction"
    @pointerdown="onRootPointerDown"
  >
    <slot :values="values" />
    <template v-if="name">
      <input
        v-for="(v, i) in values"
        :key="i"
        type="hidden"
        :name="values.length > 1 ? `${name}[]` : name"
        :value="v"
        :required="required"
      >
    </template>
  </Primitive>
</template>
