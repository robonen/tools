<script lang="ts">
import type { CSSProperties, Ref } from 'vue';
import type { PrimitiveProps } from '../../internal/primitive';
import type { TransformBoxDirection, TransformBoxModifiers } from './context';
import type { Point, TransformBoxHandlePosition, TransformBoxPivot, TransformBoxValue } from './utils';

/**
 * A headless move / scale / rotate bounding box. The root owns the transform
 * `{ x, y, width, height, rotation }` (controlled via `v-model` or uncontrolled
 * via `defaultValue`), sizes and rotates itself to it, and provides the gesture
 * machinery to its handle parts: `TransformBoxHandle` (8 scale handles),
 * `TransformBoxRotateHandle`, and the optional `TransformBoxStatus` live region.
 *
 * All math (rotated-box resize, aspect lock, flip, rotation) lives in pure
 * helpers in `./utils` so Crop can share `resizeEdge`/`constrainRect`/etc.
 * without importing any component. The body itself is draggable (move) and
 * keyboard-focusable (arrow-move); handles delegate their gesture math here.
 *
 * Reach for it whenever a user repositions, resizes, or rotates a free object on
 * a canvas (image, shape, text frame, crop region).
 */
export interface TransformBoxRootProps extends PrimitiveProps {
  /** Controlled transform (`v-model`). `null` resets to `defaultValue`. */
  modelValue?: TransformBoxValue | null;
  /**
   * Uncontrolled initial transform.
   * @default { x: 0, y: 0, width: 100, height: 100, rotation: 0 }
   */
  defaultValue?: TransformBoxValue;
  /**
   * Lock the width/height ratio (`width / height`) during scaling. `null`
   * disables the lock; corners still aspect-lock while Shift is held.
   * @default null
   */
  aspectRatio?: number | null;
  /**
   * Snap rotation to multiples of this many degrees while Shift is held during a
   * rotate drag. `0` disables rotation snapping.
   * @default 0
   */
  rotationSnap?: number;
  /**
   * Allow corners/edges to flip past their anchor (negative size, mirrored).
   * When `false`, an edge clamps at the minimum size instead of flipping.
   * @default true
   */
  allowFlip?: boolean;
  /** Minimum box width. @default 1 */
  minWidth?: number;
  /** Minimum box height. @default 1 */
  minHeight?: number;
  /**
   * Pivot that rotation and symmetric (Alt) resize anchor to: `'center'` or a
   * fractional `{ x, y }` in `[0, 1]²` of the box.
   * @default 'center'
   */
  pivot?: TransformBoxPivot;
  /** Per-keystroke move/resize step (Arrow keys). @default 1 */
  keyboardStep?: number;
  /** Larger move step (Shift+Arrow when moving the body). @default 10 */
  keyboardLargeStep?: number;
  /** Per-keystroke rotation step in degrees (rotate handle). @default 1 */
  rotationStep?: number;
  /**
   * Whether the box is selected/active (`v-model:selected`). A standalone box
   * defaults to selected; a multi-object editor binds this for click-to-activate.
   * @default true
   */
  selected?: boolean;
  /** Disable all interaction. @default false */
  disabled?: boolean;
  /**
   * Writing direction. Omitted → inherited from the nearest `ConfigProvider`
   * (falling back to `'ltr'`); affects horizontal keyboard nudge sign.
   */
  dir?: TransformBoxDirection;
}

export interface TransformBoxRootEmits {
  /** Emitted when a gesture or keypress settles, with the final transform. */
  transformCommit: [value: TransformBoxValue];
}

/** Default transform for the uncontrolled box. */
const DEFAULT_VALUE: TransformBoxValue = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useDirection } from '../../utilities/config-provider';
import { useForwardExpose } from '@robonen/vue';
import { useSnapping } from '../../internal/snapping';
import { usePointerDrag } from '../../internal/pointer-drag';
import { provideTransformBoxContext } from './context';
import {
  boxCenter,
  constrainRect,
  moveBox,
  pointerAngle,
  resizeEdge,
  resolvePivot,
  rotatePoint,
  rotateVector,
  shortestAngleDelta,
  snapRotation,
} from './utils';

const {
  defaultValue = DEFAULT_VALUE,
  aspectRatio = null,
  rotationSnap = 0,
  allowFlip = true,
  minWidth = 1,
  minHeight = 1,
  pivot = 'center',
  keyboardStep = 1,
  keyboardLargeStep = 10,
  rotationStep = 1,
  disabled = false,
  dir,
  as = 'div',
} = defineProps<TransformBoxRootProps>();

const emit = defineEmits<TransformBoxRootEmits>();
const direction = useDirection(() => dir);

// `defineModel` drives controlled (`v-model`) and uncontrolled modes; in
// uncontrolled mode it is `undefined` until first write, so `localValue` seeds
// from `defaultValue`. `null` resets to `defaultValue` for parity with the rest
// of the package.
const model = defineModel<TransformBoxValue | null>();
const selectedModel = defineModel<boolean>('selected', { default: true });

// `shallowRef` — the transform object is always replaced wholesale.
const localValue = shallowRef<TransformBoxValue>(model.value ? { ...model.value } : { ...defaultValue });

watch(model, (v) => {
  if (v === null || v === undefined) {
    localValue.value = { ...defaultValue };
    return;
  }
  if (v === localValue.value) return;
  localValue.value = { ...v };
});

const value = computed<TransformBoxValue>({
  get: () => localValue.value,
  set: (v) => {
    localValue.value = v;
    // `defineModel` emits `update:modelValue` on write — no manual emit needed.
    model.value = v;
  },
});

const flippedX = shallowRef(false);
const flippedY = shallowRef(false);
const transforming = shallowRef(false);

/** Normalize (min-size + flip fold) then write a transform, preserving rotation. */
function setValueRaw(next: TransformBoxValue): void {
  if (disabled) return;
  const norm = constrainRect(next, minWidth, minHeight);
  norm.rotation = next.rotation;
  value.value = norm;
}

function commit(): void {
  emit('transformCommit', { ...localValue.value });
}

function setSelected(v: boolean): void {
  if (disabled) return;
  if (selectedModel.value === v) return;
  selectedModel.value = v;
}

// ── snapping engine ───────────────────────────────────────────────────────────
// The root owns one snap engine; consumers feed it targets via the context.
// Kept as a 2d point snap so a moved box can snap on either axis. Targets [].
const snapping = useSnapping({
  enabled: () => !disabled,
  axis: '2d',
});

const rootRef = shallowRef<HTMLElement | null>(null);

/** Client-space center of the current box, derived from the rendered rect. */
function clientCenter(): Point | null {
  const el = rootRef.value;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    // Degenerate box (w=0/h=0): the rect still has a position; use its top-left.
    return { x: rect.left, y: rect.top };
  }
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// ── scale gesture (math owned here; the handle drives the pointer) ─────────────
let scaleStartBox: TransformBoxValue | null = null;

function beginScale(_handle: TransformBoxHandlePosition): void {
  if (disabled) return;
  scaleStartBox = { ...localValue.value };
  transforming.value = true;
  setSelected(true);
}

function updateScale(handle: TransformBoxHandlePosition, screenDelta: Point, mods: TransformBoxModifiers): void {
  if (!scaleStartBox) return;
  // Screen-space cumulative delta → rotate into the box's LOCAL axes. This is
  // the load-bearing step for rotated boxes: an axis-aligned delta is wrong once
  // rotation ≠ 0.
  const local = rotateVector(screenDelta, -scaleStartBox.rotation);
  // Shift requests an aspect lock at the start box's ratio (corners); the
  // explicit `aspectRatio` prop always locks regardless of Shift.
  const ratio = mods.shift && (aspectRatio === null || aspectRatio === undefined)
    ? (scaleStartBox.height === 0 ? 1 : Math.abs(scaleStartBox.width / scaleStartBox.height))
    : aspectRatio;
  const result = resizeEdge(scaleStartBox, handle, local, {
    minWidth,
    minHeight,
    aspectRatio: ratio,
    symmetric: mods.alt,
    pivot,
    allowFlip,
  });
  flippedX.value = result.flippedX;
  flippedY.value = result.flippedY;
  setValueRaw(result.box);
}

function endScale(doCommit: boolean): void {
  transforming.value = false;
  scaleStartBox = null;
  if (doCommit) commit();
}

// ── rotate gesture ─────────────────────────────────────────────────────────────
let rotStartAngle = 0;
let rotStartRotation = 0;
let rotPivotClient: Point | null = null;

function beginRotate(pointer: Point, _handleEl: HTMLElement): void {
  if (disabled) return;
  transforming.value = true;
  setSelected(true);
  const center = clientCenter();
  if (!center) {
    rotPivotClient = null;
    return;
  }
  const box = localValue.value;
  const localPivot = resolvePivot(box, pivot);
  const localCenter = boxCenter(box);
  // Offset of pivot from center in local axes, rotated to client space.
  const offset = rotatePoint(
    { x: localPivot.x - localCenter.x, y: localPivot.y - localCenter.y },
    box.rotation,
  );
  rotPivotClient = { x: center.x + offset.x, y: center.y + offset.y };
  rotStartRotation = box.rotation;
  rotStartAngle = pointerAngle(pointer, rotPivotClient);
}

function updateRotate(pointer: Point, mods: TransformBoxModifiers): void {
  if (!rotPivotClient) return;
  const current = pointerAngle(pointer, rotPivotClient);
  let next = rotStartRotation + shortestAngleDelta(rotStartAngle, current);
  if (mods.shift && rotationSnap > 0) next = snapRotation(next, rotationSnap);
  setValueRaw({ ...localValue.value, rotation: next });
}

function endRotate(doCommit: boolean): void {
  transforming.value = false;
  rotPivotClient = null;
  if (doCommit) commit();
}

// ── move gesture (whole-box drag, owned by the root) ───────────────────────────
let moveStartBox: TransformBoxValue | null = null;

usePointerDrag(rootRef, {
  threshold: 3,
  disabled: () => disabled,
  buttons: [0],
  onStart: () => {
    moveStartBox = { ...localValue.value };
    transforming.value = true;
    setSelected(true);
  },
  onMove: (state) => {
    if (!moveStartBox) return;
    // Move is in WORLD/client space; translation is rotation-invariant. Snap the
    // moved origin if targets are configured.
    const moved = moveBox(moveStartBox, { x: state.total.x, y: state.total.y });
    const snapped = snapping.snap2d({ x: moved.x, y: moved.y });
    setValueRaw({ ...moved, x: snapped.point.x, y: snapped.point.y });
  },
  onEnd: () => {
    transforming.value = false;
    moveStartBox = null;
    snapping.reset();
  },
  onCommit: () => commit(),
});

// ── keyboard ────────────────────────────────────────────────────────────────────
function dirSign(): number {
  return direction.value === 'rtl' ? -1 : 1;
}

function nudgeMove(dx: number, dy: number): void {
  if (disabled) return;
  setValueRaw(moveBox(localValue.value, { x: dx, y: dy }));
  commit();
}

function nudgeScale(handle: TransformBoxHandlePosition, dx: number, dy: number, mods: TransformBoxModifiers): void {
  if (disabled) return;
  const box = localValue.value;
  // Keyboard deltas are already in the box's LOCAL axes (Arrow keys map to
  // edges, not screen pixels), so no rotation transform is applied.
  const ratio = mods.shift
    ? (box.height === 0 ? 1 : Math.abs(box.width / box.height))
    : aspectRatio;
  const result = resizeEdge(box, handle, { x: dx, y: dy }, {
    minWidth,
    minHeight,
    aspectRatio: ratio,
    symmetric: mods.alt,
    pivot,
    allowFlip,
  });
  flippedX.value = result.flippedX;
  flippedY.value = result.flippedY;
  setValueRaw(result.box);
  commit();
}

function nudgeRotate(delta: number): void {
  if (disabled) return;
  setValueRaw({ ...localValue.value, rotation: localValue.value.rotation + delta });
  commit();
}

function onBodyKeyDown(event: KeyboardEvent): void {
  if (disabled) return;
  const step = event.shiftKey ? keyboardLargeStep : keyboardStep;
  const sign = dirSign();
  let dx = 0;
  let dy = 0;
  switch (event.key) {
    case 'ArrowLeft':
      dx = -step * sign;
      break;
    case 'ArrowRight':
      dx = step * sign;
      break;
    case 'ArrowUp':
      dy = -step;
      break;
    case 'ArrowDown':
      dy = step;
      break;
    default:
      return;
  }
  event.preventDefault();
  nudgeMove(dx, dy);
}

// ── render geometry ─────────────────────────────────────────────────────────────
const boxStyle = computed<CSSProperties>(() => {
  const v = localValue.value;
  // Rotate about the box center so `pivot` stays decoupled from the CSS origin
  // (pivot only drives symmetric resize/rotation math, not the render box).
  return {
    position: 'absolute',
    left: '0',
    top: '0',
    width: `${Math.max(0, v.width)}px`,
    height: `${Math.max(0, v.height)}px`,
    transform: `translate(${v.x}px, ${v.y}px) rotate(${v.rotation}deg)`,
    transformOrigin: 'center center',
    touchAction: 'none',
  };
});

// Keep the box valid if min-size props change.
watch([() => minWidth, () => minHeight], () => {
  const norm = constrainRect(localValue.value, minWidth, minHeight);
  norm.rotation = localValue.value.rotation;
  if (norm.width !== localValue.value.width || norm.height !== localValue.value.height) {
    setValueRaw(norm);
  }
});

provideTransformBoxContext({
  value,
  setValue: setValueRaw,
  beginScale,
  updateScale,
  endScale,
  beginRotate,
  updateRotate,
  endRotate,
  nudgeScale,
  nudgeMove,
  nudgeRotate,
  snapping,
  selected: selectedModel as unknown as Ref<boolean>,
  setSelected,
  disabled: toRef(() => disabled),
  transforming,
  direction,
  pivot: toRef(() => pivot),
  keyboardStep: toRef(() => keyboardStep),
  keyboardLargeStep: toRef(() => keyboardLargeStep),
  rotationStep: toRef(() => rotationStep),
  rotationSnap: toRef(() => rotationSnap),
  flippedX,
  flippedY,
});

defineExpose({ value, selected: selectedModel });

// `useForwardExpose` runs AFTER `defineExpose` so it merges the prior expose
// bindings (plus props + `$el`) instead of clobbering them.
const { forwardRef, currentElement } = useForwardExpose();
watch(currentElement, (el) => {
  rootRef.value = el ?? null;
}, { immediate: true });
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    tabindex="0"
    :dir="direction"
    :style="boxStyle"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-selected="selectedModel ? '' : undefined"
    :data-transforming="transforming ? '' : undefined"
    :data-flipped-x="flippedX ? '' : undefined"
    :data-flipped-y="flippedY ? '' : undefined"
    @keydown="onBodyKeyDown"
  >
    <slot
      :value="value"
      :selected="selectedModel"
      :transforming="transforming"
    />
  </Primitive>
</template>
