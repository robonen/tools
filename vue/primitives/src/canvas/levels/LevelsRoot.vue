<script lang="ts">
import type { LevelsDirection, LevelsOrientation } from './context';
import type { LevelsHandleKind, LevelsValue } from './utils';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A headless, accessible Photoshop-style levels control. The root owns a
 * `LevelsValue` — input `black`/`white` clipping points (`0..255`), a `gamma`
 * midtone factor (`0.1..9.99`), and an `outputBlack`/`outputWhite` range
 * (`0..255`) — controlled via `v-model` or uncontrolled via `defaultValue`. It
 * is a constrained multi-thumb slider: `black` is kept strictly below `white`
 * (by `minStepsBetweenHandles * step`) and the output handles keep their order,
 * with a value pushed past its neighbour pinning rather than swapping. The root
 * handles pointer drags and keyboard for the thumbs, exposes the `0..255` output
 * LUT via `getOutputCurve`, and can derive auto black/white from a histogram via
 * `autoLevels`. Provides context to `LevelsTrack`, `LevelsThumb`, and
 * `LevelsHandleValue`. Pair it with `HistogramRoot` for a full levels editor.
 */
export interface LevelsRootProps extends PrimitiveProps {
  /** Uncontrolled initial value. @default { black: 0, gamma: 1, white: 255, outputBlack: 0, outputWhite: 255 } */
  defaultValue?: LevelsValue;
  /** Step for the `0..255` handles (black/white/output). @default 1 */
  step?: number;
  /** Step for the gamma handle. @default 0.01 */
  gammaStep?: number;
  /** Large-step multiplier (Page keys / Shift+Arrow). @default 10 */
  largeStep?: number;
  /** Minimum gap (in `step`s) the black handle keeps below white. @default 1 */
  minStepsBetweenHandles?: number;
  /** Disable all interaction. @default false */
  disabled?: boolean;
  /** Orientation. @default 'horizontal' */
  orientation?: LevelsOrientation;
  /** Writing direction (inherited from `ConfigProvider` when omitted). */
  dir?: LevelsDirection;
  /** Invert the direction of interaction. @default false */
  inverted?: boolean;
}

export interface LevelsRootEmits {
  /** Fired when a drag or keypress settles. */
  valueCommit: [value: LevelsValue];
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { provideLevelsContext } from './context';
import { useDirection } from '../../utilities/config-provider';
import { useForwardExpose } from '@robonen/vue';
import {
  LEVELS_DEFAULT_VALUE,
  LEVELS_GAMMA_MAX,
  LEVELS_GAMMA_MIN,
  LEVELS_INPUT_MAX,
  LEVELS_INPUT_MIN,
  buildOutputCurve,
  clampHandle,
  computeAutoLevels,
  handleBounds,
  roundClamp,
} from './utils';
import { getStepDecimals, scaleLinear } from '../../internal/scale';

const {
  defaultValue,
  step = 1,
  gammaStep = 0.01,
  largeStep = 10,
  minStepsBetweenHandles = 1,
  disabled = false,
  orientation = 'horizontal',
  dir,
  inverted = false,
  as = 'div',
} = defineProps<LevelsRootProps>();

const emit = defineEmits<LevelsRootEmits>();

const direction = useDirection(() => dir);

// `defineModel` drives controlled (`v-model`) + uncontrolled modes; in
// uncontrolled mode `model.value` is `undefined` until first write, so
// `localValue` is the live source of truth (synchronous multi-step updates
// can't wait on a prop re-flow). `null` resets to the seed.
const model = defineModel<LevelsValue | null>();

function seedValue(): LevelsValue {
  const v = model.value ?? defaultValue ?? LEVELS_DEFAULT_VALUE;
  return { ...v };
}

const localValue = ref<LevelsValue>(seedValue());

watch(model, (v) => {
  if (v === null || v === undefined) return;
  if (v === localValue.value) return;
  localValue.value = { ...v };
});

const value = computed<LevelsValue>({
  get: () => localValue.value,
  set: (v) => {
    localValue.value = v;
    // `defineModel` emits `update:modelValue` on write.
    model.value = v;
  },
});

// Cache step decimals out of the pointermove path; refresh on step change.
let stepDecimals = getStepDecimals(step);
let gammaDecimals = getStepDecimals(gammaStep);
watch(() => step, (s) => {
  stepDecimals = getStepDecimals(s);
});
watch(() => gammaStep, (s) => {
  gammaDecimals = getStepDecimals(s);
});

const trackRef = shallowRef<HTMLElement | null>(null);

const minGap = computed(() => minStepsBetweenHandles * step);

/** Snap a candidate to the handle's step grid (gamma uses `gammaStep`). */
function snapHandle(kind: LevelsHandleKind, raw: number): number {
  if (kind === 'gamma') {
    const snapped = Math.round(raw / gammaStep) * gammaStep;
    return roundClamp(snapped, LEVELS_GAMMA_MIN, LEVELS_GAMMA_MAX, Math.max(gammaDecimals, 2));
  }
  const snapped = Math.round(raw / step) * step;
  return roundClamp(snapped, LEVELS_INPUT_MIN, LEVELS_INPUT_MAX, stepDecimals);
}

function commit(): void {
  emit('valueCommit', { ...localValue.value });
}

/** Apply `next` to `kind` with snapping + neighbour clamping; no-op if unchanged. */
function applyHandle(kind: LevelsHandleKind, next: number, doCommit: boolean): void {
  if (disabled) return;
  const snapped = snapHandle(kind, next);
  const clamped = clampHandle(kind, snapped, localValue.value, minGap.value);
  if (clamped === localValue.value[kind]) {
    if (doCommit) commit();
    return;
  }
  value.value = { ...localValue.value, [kind]: clamped };
  if (doCommit) commit();
}

function setHandle(kind: LevelsHandleKind, next: number): void {
  applyHandle(kind, next, false);
}

function nudgeHandle(kind: LevelsHandleKind, delta: number): void {
  applyHandle(kind, localValue.value[kind] + delta, true);
}

function jumpHandle(kind: LevelsHandleKind, edge: 'min' | 'max'): void {
  if (disabled) return;
  const bounds = handleBounds(kind, localValue.value, minGap.value);
  applyHandle(kind, edge === 'min' ? bounds.min : bounds.max, true);
}

/**
 * Project a pointer event onto the `0..255` track. Returns `LEVELS_INPUT_MIN`
 * when the track is unmeasured (zero-width before mount), mirroring the slider.
 * Gamma handles are positioned on the same `0..255` axis (the gamma thumb sits
 * between black and white), so pointer math is shared.
 */
function getValueFromPointer(event: PointerEvent): number {
  const track = trackRef.value;
  if (!track) return LEVELS_INPUT_MIN;
  const rect = track.getBoundingClientRect();
  const horizontal = orientation === 'horizontal';
  const size = horizontal ? rect.width : rect.height;
  if (size === 0) return LEVELS_INPUT_MIN;
  let offset = horizontal ? event.clientX - rect.left : event.clientY - rect.top;
  // ltr horizontal: left = min. rtl flips; vertical inverts by default (top =
  // max), `inverted` flips back.
  const flip = (horizontal ? direction.value === 'rtl' : true) !== inverted;
  if (flip) offset = size - offset;
  return scaleLinear(offset, 0, size, LEVELS_INPUT_MIN, LEVELS_INPUT_MAX);
}

let activeKind: LevelsHandleKind | null = null;

/**
 * Map a `0..255` pointer position onto the gamma factor. The gamma thumb's
 * screen position is its effective input level within `[black, white]`; we
 * invert `level → t → gamma` so dragging the thumb across the window changes the
 * factor. Outside the window it pins to the gamma bounds.
 */
function pointerToGamma(pointerLevel: number): number {
  const { black, white } = localValue.value;
  const span = white - black;
  if (span <= 0) return localValue.value.gamma;
  const t = (pointerLevel - black) / span;
  if (t <= 0) return LEVELS_GAMMA_MAX;
  if (t >= 1) return LEVELS_GAMMA_MIN;
  // level = black + 0.5**gamma * span  ⇒  gamma = log2(1/t).
  const gamma = Math.log2(1 / t);
  return gamma;
}

function applyPointer(kind: LevelsHandleKind, event: PointerEvent): void {
  const pointerLevel = getValueFromPointer(event);
  if (kind === 'gamma') {
    setHandle('gamma', pointerToGamma(pointerLevel));
  }
  else {
    setHandle(kind, pointerLevel);
  }
}

function handlePointerMove(event: PointerEvent): void {
  if (activeKind === null) return;
  applyPointer(activeKind, event);
}

function handlePointerUp(): void {
  if (activeKind === null) return;
  activeKind = null;
  globalThis.removeEventListener('pointermove', handlePointerMove);
  globalThis.removeEventListener('pointerup', handlePointerUp);
  commit();
}

function startDrag(kind: LevelsHandleKind, event: PointerEvent): void {
  if (disabled || event.button !== 0) return;
  event.preventDefault();
  (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  activeKind = kind;
  applyPointer(kind, event);
  globalThis.addEventListener('pointermove', handlePointerMove);
  globalThis.addEventListener('pointerup', handlePointerUp);
}

// The window listeners opened by `startDrag` are removed only inside
// `handlePointerUp`. If the Root unmounts while a thumb drag is active (editor
// panel closes mid-drag), that pointerup never fires for this scope and both
// listeners leak — retaining the dead instance and running `setHandle` on it for
// every later pointermove on the page. Detach on scope dispose (no commit).
onScopeDispose(() => {
  globalThis.removeEventListener('pointermove', handlePointerMove);
  globalThis.removeEventListener('pointerup', handlePointerUp);
});

function getOutputCurve(size = 256): number[] {
  return buildOutputCurve(localValue.value, size);
}

function autoLevels(histogram?: number[]): void {
  if (disabled) return;
  const { black, white } = computeAutoLevels(histogram);
  // Set white first when it would otherwise be pinned below the incoming black.
  value.value = { ...localValue.value, black, white };
  commit();
}

provideLevelsContext({
  value,
  step: toRef(() => step),
  gammaStep: toRef(() => gammaStep),
  largeStep: toRef(() => largeStep),
  minStepsBetweenHandles: toRef(() => minStepsBetweenHandles),
  orientation: toRef(() => orientation),
  direction,
  inverted: toRef(() => inverted),
  disabled: toRef(() => disabled),
  trackRef,
  setHandle,
  nudgeHandle,
  jumpHandle,
  getValueFromPointer,
  startDrag,
  getOutputCurve,
  autoLevels,
});

// `defineExpose` BEFORE `useForwardExpose` so the composable merges these
// bindings (plus props + `$el`) instead of clobbering them.
defineExpose({ value, getOutputCurve, autoLevels });
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="group"
    :dir="direction"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-orientation="orientation"
  >
    <slot :value="value" :get-output-curve="getOutputCurve" :auto-levels="autoLevels" />
  </Primitive>
</template>
