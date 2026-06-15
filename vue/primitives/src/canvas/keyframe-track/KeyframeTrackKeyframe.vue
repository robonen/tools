<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A single draggable keyframe on the track, rendered as `role="slider"`. It
 * positions itself by its `time` (horizontal projection) and — in `valueAxis`
 * mode — its `value` (vertical projection), and handles pointer drags plus
 * keyboard editing.
 *
 * The single `aria-valuenow` carries the keyframe TIME in seconds (or its value
 * in `valueAxis` mode); `aria-valuetext` announces the formatted time, the
 * property name, and the value. Keyframes share one tab-stop (roving focus): Tab
 * moves between them, the selected keyframe is the active stop. Left/Right nudge
 * the time by `step` (Shift = `largeStep`, dir-aware, neighbour-clamped);
 * Up/Down nudge the `value` by `valueStep` in `valueAxis` mode (else roving
 * focus); Home/End jump the time to min/max; Delete removes the keyframe.
 */
export interface KeyframeTrackKeyframeProps extends PrimitiveProps {
  /** The id of the keyframe this slider renders. */
  keyframeId: string;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useKeyframeTrackContext } from './context';
import { defaultKeyframeValueText } from './utils';

const { keyframeId, as = 'div' } = defineProps<KeyframeTrackKeyframeProps>();
const ctx = useKeyframeTrackContext();

// O(1) lookup via the root's memoized id → index map instead of scanning the
// keyframe array twice (find + findIndex) per part on every drag frame.
const index = computed(() => ctx.indexById.value.get(keyframeId) ?? -1);
const keyframe = computed(() => ctx.keyframes.value[index.value]);

const isSelected = computed(() => ctx.selectedId.value === keyframeId);
const isDragging = computed(() => ctx.draggingId.value === keyframeId);

// Roving focus: only the selected keyframe (or the first, when none selected) is
// in the tab order.
const isTabStop = computed(() => {
  if (ctx.disabled.value) return false;
  if (ctx.selectedId.value === null) return index.value === 0;
  return isSelected.value;
});
const tabindex = computed(() => {
  if (ctx.disabled.value) return -1;
  return isTabStop.value ? 0 : -1;
});

// ── position ───────────────────────────────────────────────────────────────
const pxX = computed(() => (keyframe.value ? ctx.projection(keyframe.value.time) : 0));
const pxY = computed(() => (keyframe.value ? ctx.projectValue(keyframe.value.value) : 0));

const positionStyle = computed<{ left: string; top: string | undefined }>(() => ({
  left: `${pxX.value}px`,
  top: ctx.valueAxis.value ? `${pxY.value}px` : undefined,
}));

// ── ARIA ─────────────────────────────────────────────────────────────────────
const ariaValueMin = computed(() => {
  if (ctx.valueAxis.value) return Math.min(ctx.valueRange.value[0], ctx.valueRange.value[1]);
  return 0;
});
const ariaValueMax = computed(() => {
  if (ctx.valueAxis.value) return Math.max(ctx.valueRange.value[0], ctx.valueRange.value[1]);
  return ctx.duration.value;
});
const ariaValueNow = computed(() => {
  if (!keyframe.value) return 0;
  return ctx.valueAxis.value ? keyframe.value.value : keyframe.value.time;
});
const ariaValueText = computed(() => {
  if (!keyframe.value) return undefined;
  const time = ctx.formatTime(keyframe.value.time);
  const valueText = defaultKeyframeValueText(keyframe.value.value, ctx.property.value);
  return `${time}, ${valueText}`;
});

// ── roving registration ───────────────────────────────────────────────────────
const { forwardRef, currentElement } = useForwardExpose();
watch(currentElement, (node) => {
  ctx.registerKeyframeEl(keyframeId, node ?? null);
});
onBeforeUnmount(() => ctx.registerKeyframeEl(keyframeId, null));

// ── pointer drag ──────────────────────────────────────────────────────────────
// x → time, y → value (valueAxis). Capture the keyframe's pixel origin at drag
// start so cumulative client-px totals (which equal lane px 1:1) project back
// through the projections without needing the lane rect.
let dragOriginX = 0;
let dragOriginY = 0;
usePointerDrag(currentElement, {
  axis: 'both',
  threshold: 0,
  disabled: () => ctx.disabled.value,
  onStart: () => {
    ctx.select(keyframeId);
    dragOriginX = pxX.value;
    dragOriginY = pxY.value;
  },
  onMove: (state) => {
    if (!keyframe.value) return;
    const rawTime = ctx.invert(dragOriginX + state.total.x);
    const time = ctx.snapTime(rawTime, keyframeId);
    const value = ctx.valueAxis.value ? ctx.invertValue(dragOriginY + state.total.y) : undefined;
    ctx.moveKeyframe(keyframeId, time, value, true);
  },
  onEnd: () => {
    ctx.commit();
  },
});

// ── click / keyboard ──────────────────────────────────────────────────────────
function onPointerDownSelect(): void {
  if (ctx.disabled.value) return;
  ctx.select(keyframeId);
}

function nudgeTime(deltaSeconds: number): void {
  if (!keyframe.value) return;
  ctx.moveKeyframe(keyframeId, keyframe.value.time + deltaSeconds, undefined, false);
}

function nudgeValue(deltaValue: number): void {
  if (!keyframe.value) return;
  ctx.moveKeyframe(keyframeId, keyframe.value.time, keyframe.value.value + deltaValue, false);
}

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value || !keyframe.value) return;
  const rtl = ctx.direction.value === 'rtl';
  const unit = event.shiftKey ? ctx.largeStep.value : ctx.step.value;

  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      nudgeTime(rtl ? -unit : unit);
      return;
    case 'ArrowLeft':
      event.preventDefault();
      nudgeTime(rtl ? unit : -unit);
      return;
    case 'ArrowUp':
      event.preventDefault();
      if (ctx.valueAxis.value) nudgeValue(ctx.valueStep.value);
      else ctx.focusAdjacent(keyframeId, 1);
      return;
    case 'ArrowDown':
      event.preventDefault();
      if (ctx.valueAxis.value) nudgeValue(-ctx.valueStep.value);
      else ctx.focusAdjacent(keyframeId, -1);
      return;
    case 'Home':
      event.preventDefault();
      nudgeTime(-Number.MAX_SAFE_INTEGER);
      return;
    case 'End':
      event.preventDefault();
      nudgeTime(Number.MAX_SAFE_INTEGER);
      return;
    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      ctx.removeKeyframe(keyframeId);
      break;
    default:
      break;
  }
}

function onFocus(): void {
  if (!ctx.disabled.value) ctx.select(keyframeId);
}
</script>

<template>
  <Primitive
    v-if="keyframe"
    :ref="forwardRef"
    :as="as"
    role="slider"
    :tabindex="tabindex"
    :aria-valuemin="ariaValueMin"
    :aria-valuemax="ariaValueMax"
    :aria-valuenow="ariaValueNow"
    :aria-valuetext="ariaValueText"
    :aria-orientation="ctx.valueAxis.value ? 'vertical' : 'horizontal'"
    :aria-selected="isSelected || undefined"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-selected="isSelected ? '' : undefined"
    :data-dragging="isDragging ? '' : undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :style="positionStyle"
    @keydown="onKeyDown"
    @pointerdown="onPointerDownSelect"
    @focus="onFocus"
  >
    <slot
      :keyframe="keyframe"
      :selected="isSelected"
      :dragging="isDragging"
      :x="pxX"
      :y="pxY"
    />
  </Primitive>
</template>
