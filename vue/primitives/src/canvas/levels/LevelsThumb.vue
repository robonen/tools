<script lang="ts">
import type { LevelsHandleKind } from './utils';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A draggable levels handle rendered as `role="slider"`, one per `kind`
 * (`'black'` / `'gamma'` / `'white'` / `'outputBlack'` / `'outputWhite'`),
 * placed inside `LevelsTrack`. It positions itself along the `0..255` track,
 * exposes full per-kind ARIA (`aria-label`, `aria-valuemin/max/now`), and
 * handles pointer drags and the keyboard (Arrow / Page / Home / End,
 * neighbour-clamped). The gamma thumb is special: it sits at its effective
 * midtone input level, its `aria-valuenow` carries the gamma FACTOR
 * (`0.1..9.99`), and its `aria-valuetext` states the effective level
 * (e.g. "Gamma 1.00, midtone at 128"). Keyboard nudges use `step` for the
 * `0..255` handles and `gammaStep` for gamma.
 */
export interface LevelsThumbProps extends PrimitiveProps {
  /** Which handle this thumb controls. */
  kind: LevelsHandleKind;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useLevelsContext } from './context';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useForwardExpose } from '@robonen/vue';
import {
  LEVELS_HANDLE_LABELS,
  LEVELS_INPUT_MAX,
  LEVELS_INPUT_MIN,
  gammaMidtoneLevel,
  handleBounds,
} from './utils';

const { kind, as = 'span' } = defineProps<LevelsThumbProps>();
const ctx = useLevelsContext();
const { forwardRef, currentElement } = useForwardExpose();

const value = computed(() => ctx.value.value);
const isGamma = computed(() => kind === 'gamma');

/** The number reported as `aria-valuenow` (gamma → factor, else the handle value). */
const ariaValueNow = computed(() => (isGamma.value ? value.value.gamma : value.value[kind]));

/** Per-kind legal bounds (neighbour-aware). For gamma these are the factor bounds. */
const bounds = computed(() => handleBounds(kind, value.value, ctx.minStepsBetweenHandles.value * ctx.step.value));

/**
 * The `0..255` level the thumb is drawn at. Every handle but gamma maps directly
 * to its value; gamma is drawn at its effective midtone level so it slides
 * between the black and white thumbs.
 */
const trackLevel = computed(() => {
  if (isGamma.value) return gammaMidtoneLevel(value.value);
  return value.value[kind];
});

const percentage = computed(() => {
  const range = LEVELS_INPUT_MAX - LEVELS_INPUT_MIN;
  if (range === 0) return 0;
  return ((trackLevel.value - LEVELS_INPUT_MIN) / range) * 100;
});

const positionStyle = computed<{
  left: string | undefined;
  right: string | undefined;
  top: string | undefined;
  bottom: string | undefined;
}>(() => {
  const pct = `${percentage.value}%`;
  const horizontal = ctx.orientation.value === 'horizontal';
  const rtl = ctx.direction.value === 'rtl';
  const inverted = ctx.inverted.value;
  if (horizontal) {
    const flip = rtl !== inverted;
    return { left: flip ? undefined : pct, right: flip ? pct : undefined, top: undefined, bottom: undefined };
  }
  return { left: undefined, right: undefined, top: inverted ? pct : undefined, bottom: inverted ? undefined : pct };
});

const ariaLabel = computed(() => LEVELS_HANDLE_LABELS[kind]);

/** Gamma's `aria-valuetext` carries factor + the effective midtone level. */
const ariaValueText = computed<string | undefined>(() => {
  if (!isGamma.value) return undefined;
  const factor = value.value.gamma.toFixed(2);
  const level = gammaMidtoneLevel(value.value);
  return `Gamma ${factor}, midtone at ${level}`;
});

// Pointer drag is handled by the root (it owns the shared pointermove math and
// the gamma inversion); the thumb just hands off the kind on press.
usePointerDrag(currentElement, {
  axis: ctx.orientation.value === 'horizontal' ? 'x' : 'y',
  threshold: 0,
  disabled: () => ctx.disabled.value,
  onStart: (state, event) => {
    ctx.startDrag(kind, event);
    // `startDrag` already applied the press position; consume the event so the
    // root owns subsequent moves via its window listeners.
    void state;
  },
});

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const horizontal = ctx.orientation.value === 'horizontal';
  const rtl = ctx.direction.value === 'rtl';
  const inverted = ctx.inverted.value;
  // Gamma steps by `gammaStep`; every other handle by `step`. Shift jumps by the
  // same large step as Page.
  const unit = isGamma.value ? ctx.gammaStep.value : ctx.step.value;
  const big = unit * ctx.largeStep.value;
  // Per-press magnitude (large for Shift/Page, otherwise one step).
  const mag = event.shiftKey ? big : unit;

  let delta: number;
  switch (event.key) {
    // Horizontal: "increase" is right in ltr (flipped by rtl/inverted).
    case 'ArrowRight':
      if (!horizontal) return;
      delta = (rtl !== inverted ? -1 : 1) * mag;
      break;
    case 'ArrowLeft':
      if (!horizontal) return;
      delta = (rtl !== inverted ? 1 : -1) * mag;
      break;
    // Vertical: "increase" is up (flipped by inverted).
    case 'ArrowUp':
      if (horizontal) return;
      delta = (inverted ? -1 : 1) * mag;
      break;
    case 'ArrowDown':
      if (horizontal) return;
      delta = (inverted ? 1 : -1) * mag;
      break;
    case 'PageUp':
      delta = big;
      break;
    case 'PageDown':
      delta = -big;
      break;
    case 'Home':
      event.preventDefault();
      ctx.jumpHandle(kind, 'min');
      return;
    case 'End':
      event.preventDefault();
      ctx.jumpHandle(kind, 'max');
      return;
    default:
      return;
  }
  if (delta === 0) return;
  event.preventDefault();
  ctx.nudgeHandle(kind, delta);
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="slider"
    :tabindex="ctx.disabled.value ? -1 : 0"
    :aria-label="ariaLabel"
    :aria-valuemin="bounds.min"
    :aria-valuemax="bounds.max"
    :aria-valuenow="ariaValueNow"
    :aria-valuetext="ariaValueText"
    :aria-orientation="ctx.orientation.value"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-kind="kind"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
    :style="positionStyle"
    @keydown="onKeyDown"
  >
    <slot :value="ariaValueNow" :level="trackLevel" :percent="percentage" />
  </Primitive>
</template>
