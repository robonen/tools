<script lang="ts">
import type { AngleDialDirection, AngleDialSnap, AngleDialWrap } from './context';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * An accessible circular angle / rotation picker. The root owns the angle value
 * in DEGREES (controlled via `v-model:value` or uncontrolled via
 * `defaultValue`), converts pointer presses anywhere on the dial into an angle,
 * snaps to `snap` / `step`, and handles the `0` / `360` seam either by wrapping
 * continuously (`wrap`) or bounding to an arc (`clamp`). It provides context to
 * `AngleDialThumb`, which renders the `role="slider"` handle on the ring and
 * owns keyboard interaction.
 *
 * The angle convention is fixed: `0°` points UP (12 o'clock) and increases
 * CLOCKWISE (right = 90°, down = 180°, left = 270°). Reach for it for rotation,
 * heading, or hue (a hue ring is `min: 0, max: 360, wrap: 'wrap'`).
 */
export interface AngleDialRootProps extends PrimitiveProps {
  /** Min angle in degrees. @default 0 */
  min?: number;
  /** Max angle in degrees. @default 360 */
  max?: number;
  /** Step granularity in degrees. @default 1 */
  step?: number;
  /** Increment for Page keys / Shift+Arrow, in degrees. @default 15 */
  largeStep?: number;
  /**
   * Seam behavior at the bounds. `'wrap'` lets the value cross `0` / `360`
   * continuously; `'clamp'` bounds it to the arc `[min, max]`.
   * @default 'wrap'
   */
  wrap?: AngleDialWrap;
  /**
   * Snap increments in degrees — a scalar (e.g. `15`) or an explicit list
   * (e.g. `[0, 45, 90, 135, 180, 225, 270, 315]`). `undefined` disables
   * snapping (only `step` rounding applies).
   * @default undefined
   */
  snap?: AngleDialSnap;
  /** Disable all interaction. @default false */
  disabled?: boolean;
  /**
   * Writing direction. When omitted it is inherited from the nearest
   * `ConfigProvider` (falling back to `'ltr'`); an explicit value wins.
   */
  dir?: AngleDialDirection;
  /** Uncontrolled initial angle in degrees. @default 0 */
  defaultValue?: number;
}

export interface AngleDialRootEmits {
  /** Emitted when a drag settles (pointerup), with the final angle in degrees. */
  valueCommit: [value: number];
}
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { provideAngleDialContext } from './context';
import { useDirection } from '../../utilities/config-provider';
import { useForwardExpose } from '@robonen/vue';
import { usePointerDrag } from '../../internal/pointer-drag';
import { clamp } from '@robonen/stdlib';
import {
  applySnap,
  getStepDecimals,
  pointToAngle,
  roundToStep,
  shortestDelta,
} from './utils';

const {
  min = 0,
  max = 360,
  step = 1,
  largeStep = 15,
  wrap = 'wrap',
  snap,
  disabled = false,
  dir,
  defaultValue = 0,
  as = 'div',
} = defineProps<AngleDialRootProps>();

const emit = defineEmits<AngleDialRootEmits>();

const direction = useDirection(() => dir);

// `defineModel('value')` drives controlled (`v-model:value`) and uncontrolled
// modes; in uncontrolled mode it is `undefined` until first write, so the
// internal `localValue` seeds from `defaultValue`. `null` is tolerated and
// treated like "no value" for parity with controllers that reset by binding it.
const model = defineModel<number | null>('value');

const seed = typeof model.value === 'number' ? model.value : defaultValue;
const localValue = shallowRef<number>(seed);

// Cache decimals per `step` out of the pointermove hot path.
let stepDecimals = getStepDecimals(step);
watch(() => step, (s) => {
  stepDecimals = getStepDecimals(s);
});

watch(model, (v) => {
  if (v === null || v === undefined) return;
  if (v === localValue.value) return;
  localValue.value = v;
});

const value = computed<number>({
  get: () => localValue.value,
  set: (v) => {
    if (v === localValue.value) return;
    localValue.value = v;
    // `defineModel` emits `update:value` on write — no manual emit needed.
    model.value = v;
  },
});

/**
 * Normalize a raw angle (degrees) into the committed value, applying snap then
 * step rounding then the wrap/clamp seam policy.
 *
 * In `wrap` mode the result is folded back into `[min, max)` (a full turn); in
 * `clamp` mode it is bounded to `[min, max]`.
 */
function resolve(raw: number): number {
  const isWrap = wrap === 'wrap';
  let v = applySnap(raw, snap, isWrap);
  v = roundToStep(v, step, min, stepDecimals);
  if (isWrap) {
    const span = max - min;
    if (span <= 0) return min;
    // Fold into [min, max): a 360-span dial returns [0, 360).
    const folded = ((v - min) % span + span) % span + min;
    return folded;
  }
  return clamp(v, min, max);
}

function commit(): void {
  emit('valueCommit', localValue.value);
}

// ── pointer → angle ───────────────────────────────────────────────────────
const rootRef = shallowRef<HTMLElement | null>(null);

/** Center + radius of the dial from its current rect; `radius === 0` when unlaid-out. */
function geometry(): { cx: number; cy: number; radius: number } | null {
  const el = rootRef.value;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  // Guard size===0 (mirror SliderRoot's `if (size===0) return min`): an
  // unlaid-out dial has no meaningful center, so the caller keeps the value.
  const size = Math.min(rect.width, rect.height);
  if (size === 0) return null;
  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    radius: size / 2,
  };
}

// Accumulator state for `wrap`-mode seam continuity. `lastRaw` is the previous
// frame's raw pointer angle; `accum` is the unwrapped running angle. Tracking
// the signed shortest delta per frame means dragging across the seam (e.g.
// 350° → 10°) accumulates +20° rather than snapping −340°.
let lastRaw = 0;
let accum = 0;

/**
 * Convert a client point to an angle and commit it. In `wrap` mode the value is
 * accumulated via the shortest per-frame delta so the seam is crossed smoothly;
 * a pointer exactly at the center (radius 0 from the center) is ignored.
 */
function applyPointer(
  point: { x: number; y: number },
  first: boolean,
  geo?: { cx: number; cy: number; radius: number } | null,
): void {
  if (disabled) return;
  // Use the gesture-cached geometry when given (the dial cannot move/resize
  // mid-drag), else measure live. Caching avoids a getBoundingClientRect reflow
  // on every onMove frame.
  const g = geo ?? geometry();
  if (!g) return;
  const dx = point.x - g.cx;
  const dy = point.y - g.cy;
  // Pointer exactly at center → no defined angle; ignore (keep current value).
  if (dx === 0 && dy === 0) return;

  const raw = pointToAngle(point, { x: g.cx, y: g.cy });

  if (wrap === 'wrap') {
    if (first) {
      // Seed the accumulator from the current value, re-based so the first
      // frame's raw angle maps to it without a jump.
      accum = raw;
      lastRaw = raw;
    }
    else {
      accum += shortestDelta(lastRaw, raw);
      lastRaw = raw;
    }
    value.value = resolve(accum);
  }
  else {
    // Clamp mode: the raw angle is a linear coordinate; snapping/rounding then
    // clamp to the arc. No accumulation — pushing past an end simply clamps.
    value.value = resolve(raw);
  }
}

// Center + radius snapshotted at gesture start and reused each frame.
let gestureGeo: { cx: number; cy: number; radius: number } | null = null;

usePointerDrag(rootRef, {
  threshold: 0,
  disabled: () => disabled,
  // Engage immediately on press: position the value to the press point.
  onStart: (state) => {
    gestureGeo = geometry();
    applyPointer(state.point, true, gestureGeo);
  },
  onMove: (state) => {
    applyPointer(state.point, false, gestureGeo);
  },
  onCommit: () => {
    commit();
  },
  onEnd: () => {
    gestureGeo = null;
  },
});

// ── keyboard nudge (delegated from the thumb) ──────────────────────────────
function nudge(delta: number): void {
  if (disabled) return;
  const current = localValue.value;
  // Walk from the current value; `resolve` re-folds (wrap) or clamps (clamp).
  // Near the seam, wrap mode keeps moving in one direction before re-folding.
  let next = resolve(current + delta);
  // When `snap` is coarser than `step`, a single `delta` can resolve back to the
  // current snap point — which would freeze the keyboard. Keep advancing in the
  // delta direction until the resolved value actually changes (or we cover a
  // full turn and conclude there's nowhere else to land, e.g. a clamped end).
  if (next === current && delta !== 0) {
    const span = max - min || 360;
    const maxSteps = Math.ceil(span / Math.max(Math.abs(delta), 1)) + 2;
    let probe = current;
    for (let i = 0; i < maxSteps; i++) {
      probe += delta;
      const candidate = resolve(probe);
      if (candidate !== current) {
        next = candidate;
        break;
      }
    }
  }
  if (next === current) return;
  value.value = next;
  commit();
}

function setValue(deg: number): void {
  if (disabled) return;
  value.value = resolve(deg);
  commit();
}

function toStart(): void {
  if (disabled) return;
  value.value = resolve(min);
  commit();
}

function toEnd(): void {
  if (disabled) return;
  // In wrap mode `max` folds back to `min`; land just before the seam so End is
  // distinguishable from Home. In clamp mode End is exactly `max`.
  if (wrap === 'wrap') {
    const span = max - min;
    const justBefore = span <= 0 ? min : max - step;
    value.value = resolve(justBefore);
  }
  else {
    value.value = clamp(roundToStep(max, step, min, stepDecimals), min, max);
  }
  commit();
}

// Keep the value valid if bounds change.
watch([() => min, () => max, () => wrap], () => {
  const next = resolve(localValue.value);
  if (next !== localValue.value) value.value = next;
});

provideAngleDialContext({
  value,
  min: toRef(() => min),
  max: toRef(() => max),
  step: toRef(() => step),
  largeStep: toRef(() => largeStep),
  wrap: toRef(() => wrap),
  snap: toRef(() => snap),
  disabled: toRef(() => disabled),
  direction,
  setValue,
  nudge,
  toStart,
  toEnd,
});

defineExpose({ value });

// `useForwardExpose` runs AFTER `defineExpose` so the composable merges the
// prior expose bindings (plus props + `$el`) instead of clobbering them.
const { forwardRef, currentElement } = useForwardExpose();
watch(currentElement, (el) => {
  rootRef.value = el ?? null;
}, { immediate: true });
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    :dir="direction"
  >
    <slot :value="value" />
  </Primitive>
</template>
