<script lang="ts">
import type { CropDirection, CropUnits } from './context';
import type { CropBounds, CropHandlePosition, CropRect } from './utils';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Headless crop selector rendered **over** a media element (`<img>`, `<video>`,
 * `<canvas>`). It owns a single crop rectangle — controlled via `v-model` or
 * uncontrolled via `defaultValue` — and drives moving, eight-handle resizing,
 * aspect-ratio locking, a rule-of-thirds grid, and a draw-from-empty create
 * gesture. The rect lives in NORMALIZED `0..1` fractions of the media by default
 * (resolution-independent) or in media pixels via `units: 'pixels'`.
 *
 * Supply the media size with `mediaWidth`/`mediaHeight` for standalone use, or
 * mount inside a `CanvasStageRoot` and the Root reads the stage's content size
 * automatically (props still win when given). It provides {@link CropContext} to
 * `CropArea`, `CropHandle`, `CropGrid`, and `CropOverlay`, and emits `cropCommit`
 * when a gesture or keypress settles. Reach for it to let a user pick a sub-rect
 * of an image or video (avatar crop, thumbnail framing, redaction region).
 */
export interface CropRootProps extends PrimitiveProps {
  /**
   * The crop rectangle (two-way via `v-model`). `null` means "no selection
   * yet" — the Root falls back to the full frame or stays empty depending on
   * `createOnEmpty`.
   */
  modelValue?: CropRect | null;
  /** Uncontrolled initial rect. @default null */
  defaultValue?: CropRect | null;
  /** Coordinate space for the rect and the size props. @default 'normalized' */
  units?: CropUnits;
  /** Locked `width / height` of the crop box (visual ratio), or `null` to resize freely. @default null */
  aspectRatio?: number | null;
  /** Minimum crop width, in the chosen `units`. @default 0 */
  minWidth?: number;
  /** Minimum crop height, in the chosen `units`. @default 0 */
  minHeight?: number;
  /** Media width in pixels. Read from a `CanvasStage` ancestor when omitted. @default undefined */
  mediaWidth?: number;
  /** Media height in pixels. Read from a `CanvasStage` ancestor when omitted. @default undefined */
  mediaHeight?: number;
  /** Keep the rect within the media bounds. @default true */
  constrain?: boolean;
  /** Render the rule-of-thirds grid. @default true */
  grid?: boolean;
  /** Pointerdown on empty media draws a new rect from zero. @default true */
  createOnEmpty?: boolean;
  /** Keyboard nudge step, in normalized units (scaled to px when `units: 'pixels'`). @default 0.01 */
  keyboardStep?: number;
  /** Large keyboard step (Shift+Arrow). @default keyboardStep * 10 */
  keyboardLargeStep?: number;
  /** Disable all interaction. @default false */
  disabled?: boolean;
  /** Writing direction (inherited from `ConfigProvider` when omitted). */
  dir?: CropDirection;
}

export interface CropRootEmits {
  /** Fired when a pointer gesture or keypress settles, with the committed rect (or `null`). */
  cropCommit: [rect: CropRect | null];
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { provideCropContext } from './context';
import { useDirection } from '../../utilities/config-provider';
import { useForwardExpose } from '@robonen/vue';
import { useCanvasStageContext } from '../canvas-stage/context';
import type { CanvasStageContext } from '../canvas-stage/context';
import { createRect, moveRect, normalizeRect, resizeRect, resolveAspectRatio } from './utils';

const {
  defaultValue = null,
  units = 'normalized',
  aspectRatio = null,
  minWidth = 0,
  minHeight = 0,
  mediaWidth = undefined,
  mediaHeight = undefined,
  constrain = true,
  grid = true,
  createOnEmpty = true,
  keyboardStep = 0.01,
  keyboardLargeStep = undefined,
  disabled = false,
  dir,
  as = 'div',
} = defineProps<CropRootProps>();

const emit = defineEmits<CropRootEmits>();
const direction = useDirection(() => dir);

// Optional CanvasStage ancestor — `null` when standalone. The canvas-stage
// factory `inject` throws when no provider exists *and* no fallback is given;
// passing an explicit `null` fallback makes it return `null` so Crop works
// standalone (media size then comes from the `mediaWidth`/`mediaHeight` props).
const stage = useCanvasStageContext(null as unknown as CanvasStageContext);

// Media pixel size: explicit props win; otherwise read the stage content size.
const mediaPixels = computed<CropBounds>(() => {
  const w = mediaWidth ?? stage?.contentSize.value.width ?? 0;
  const h = mediaHeight ?? stage?.contentSize.value.height ?? 0;
  return { width: w, height: h };
});

// Bounds in the rect's units: `{1,1}` normalized, real px otherwise.
const mediaSize = computed<CropBounds>(() => {
  if (units === 'normalized') return { width: 1, height: 1 };
  return mediaPixels.value;
});

// Resolve the visual aspect ratio into the rect's units (normalized needs the
// media-pixel-aspect correction so the box stays visually square/16:9/etc.).
const resolvedRatio = computed<number | null>(() =>
  resolveAspectRatio(aspectRatio, units, mediaPixels.value.width, mediaPixels.value.height),
);

// Scale keyboard steps into the rect's units. In pixel mode the normalized step
// is multiplied by the media dimension on each axis.
const largeBase = computed(() => keyboardLargeStep ?? keyboardStep * 10);
const stepX = computed(() => (units === 'normalized' ? keyboardStep : keyboardStep * mediaPixels.value.width));
const stepY = computed(() => (units === 'normalized' ? keyboardStep : keyboardStep * mediaPixels.value.height));
const largeStepX = computed(() => (units === 'normalized' ? largeBase.value : largeBase.value * mediaPixels.value.width));
const largeStepY = computed(() => (units === 'normalized' ? largeBase.value : largeBase.value * mediaPixels.value.height));

function resizeOptions() {
  return {
    aspectRatio: resolvedRatio.value,
    minWidth,
    minHeight,
    bounds: mediaSize.value,
    constrain,
  };
}

// ── model (controlled + uncontrolled) ─────────────────────────────────────────
const model = defineModel<CropRect | null>();
const seed = model.value ?? defaultValue;
const localRect = shallowRef<CropRect | null>(
  seed ? normalizeRect(seed, resizeOptions()) : null,
);

watch(model, (v) => {
  if (v === undefined) return;
  if (v === localRect.value) return;
  localRect.value = v === null ? null : normalizeRect(v, resizeOptions());
});

// Re-settle the rect when ratio / units / bounds change (e.g. ratio set on a
// free rect → re-fit; media measured later → clamp into the new bounds).
watch([resolvedRatio, mediaSize, () => constrain, () => minWidth, () => minHeight], () => {
  const r = localRect.value;
  if (r === null) return;
  const next = normalizeRect(r, resizeOptions());
  if (next.x !== r.x || next.y !== r.y || next.width !== r.width || next.height !== r.height)
    writeRect(next, false);
});

function writeRect(next: CropRect | null, commit: boolean): void {
  localRect.value = next;
  model.value = next;
  if (commit) emit('cropCommit', next);
}

function setRect(next: CropRect | null): void {
  if (disabled) return;
  writeRect(next === null ? null : normalizeRect(next, resizeOptions()), false);
}

const isEmpty = computed(() => localRect.value === null);

// ── pointer-to-units mapping ──────────────────────────────────────────────────
// The crop surface element (a media-sized container) is the projection origin: a
// client point maps to media-space units via the surface's rect. The stage's own
// zoom/pan is already baked into the surface's on-screen rect, so reading
// `getBoundingClientRect()` is correct standalone AND inside a CanvasStage — no
// extra viewport math needed.
let surfaceRect: DOMRect | null = null;

function clientToUnits(clientX: number, clientY: number): { x: number; y: number } {
  const r = surfaceRect;
  if (!r || r.width === 0 || r.height === 0) return { x: 0, y: 0 };
  let fx = (clientX - r.left) / r.width;
  if (direction.value === 'rtl') fx = 1 - fx;
  const fy = (clientY - r.top) / r.height;
  if (units === 'normalized') return { x: fx, y: fy };
  return { x: fx * mediaPixels.value.width, y: fy * mediaPixels.value.height };
}

// ── pointer gesture pipeline ──────────────────────────────────────────────────
// A single capture pipeline handles move / resize / create. Each part calls the
// matching `begin*` on pointerdown; the part passes the media surface element so
// the Root can cache its rect for the client→units projection and capture the
// pointer on it for the gesture's lifetime.
const isCropping = shallowRef(false);
let pointerId = -1;
let mode: 'move' | 'resize' | 'create' | null = null;
let activeHandle: CropHandlePosition | null = null;
let gestureStartRect: CropRect | null = null;
let createOrigin: { x: number; y: number } | null = null;
let downClientX = 0;
let downClientY = 0;
let captureEl: HTMLElement | null = null;

function setLive(next: CropRect): void {
  localRect.value = next;
  model.value = next;
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerId !== pointerId) return;
  if (!isCropping.value) isCropping.value = true;
  if (mode === 'move' && gestureStartRect) {
    const start = clientToUnits(downClientX, downClientY);
    const now = clientToUnits(event.clientX, event.clientY);
    setLive(moveRect(gestureStartRect, now.x - start.x, now.y - start.y, mediaSize.value, constrain));
  }
  else if (mode === 'resize' && gestureStartRect && activeHandle) {
    const now = clientToUnits(event.clientX, event.clientY);
    setLive(resizeRect(gestureStartRect, activeHandle, now.x, now.y, resizeOptions()));
  }
  else if (mode === 'create' && createOrigin) {
    const now = clientToUnits(event.clientX, event.clientY);
    setLive(createRect(createOrigin, now, resizeOptions()));
  }
}

function endGesture(commit: boolean): void {
  globalThis.removeEventListener('pointermove', onPointerMove);
  globalThis.removeEventListener('pointerup', onPointerUp);
  globalThis.removeEventListener('pointercancel', onPointerCancel);
  captureEl?.releasePointerCapture?.(pointerId);
  pointerId = -1;
  isCropping.value = false;
  const wasCreate = mode === 'create';
  mode = null;
  activeHandle = null;
  gestureStartRect = null;
  createOrigin = null;
  captureEl = null;
  // A create gesture that never grew past zero leaves no selection.
  if (wasCreate && localRect.value && localRect.value.width === 0 && localRect.value.height === 0)
    localRect.value = model.value = null;
  if (commit) emit('cropCommit', localRect.value);
}

function onPointerUp(event: PointerEvent): void {
  if (event.pointerId !== pointerId) return;
  endGesture(true);
}
function onPointerCancel(event: PointerEvent): void {
  if (event.pointerId !== pointerId) return;
  endGesture(false);
}

// The three window listeners + pointer capture opened by `startGesture` are torn
// down only on the pointerup/cancel that ends the gesture. If the Root unmounts
// while a gesture is in flight (parent v-if toggles crop off, route change,
// editor panel teardown), that end event never arrives for this scope and the
// listeners leak — their closures retain this (now-dead) instance, its reactive
// state and the detached capture element. Run the same teardown on scope dispose.
onScopeDispose(() => {
  if (pointerId !== -1) endGesture(false);
});

function startGesture(event: PointerEvent, surface: HTMLElement | null): void {
  // The media-sized surface is the projection origin. A part may pass its own
  // element, but the Root element (which wraps the media) is the canonical
  // surface, so prefer it when available.
  const projection = rootEl.value ?? surface;
  surfaceRect = projection ? projection.getBoundingClientRect() : null;
  pointerId = event.pointerId;
  downClientX = event.clientX;
  downClientY = event.clientY;
  isCropping.value = true;
  captureEl = (event.currentTarget as HTMLElement | null) ?? surface;
  captureEl?.setPointerCapture?.(event.pointerId);
  globalThis.addEventListener('pointermove', onPointerMove);
  globalThis.addEventListener('pointerup', onPointerUp);
  globalThis.addEventListener('pointercancel', onPointerCancel);
}

function beginMove(event: PointerEvent, surface: HTMLElement | null): void {
  if (disabled || event.button !== 0 || localRect.value === null) return;
  event.preventDefault();
  mode = 'move';
  gestureStartRect = localRect.value;
  startGesture(event, surface);
}

function beginResize(handle: CropHandlePosition, event: PointerEvent, surface: HTMLElement | null): void {
  if (disabled || event.button !== 0 || localRect.value === null) return;
  event.preventDefault();
  event.stopPropagation();
  mode = 'resize';
  activeHandle = handle;
  gestureStartRect = localRect.value;
  startGesture(event, surface);
}

function beginCreate(event: PointerEvent, surface: HTMLElement | null): void {
  if (disabled || event.button !== 0 || !createOnEmpty || localRect.value !== null) return;
  event.preventDefault();
  mode = 'create';
  const projection = rootEl.value ?? surface;
  surfaceRect = projection ? projection.getBoundingClientRect() : null;
  createOrigin = clientToUnits(event.clientX, event.clientY);
  setLive({ x: createOrigin.x, y: createOrigin.y, width: 0, height: 0 });
  startGesture(event, surface);
}

// Pointerdown landing on the Root itself (the media surface) starts a
// draw-from-empty create when there is no selection yet. CropArea / CropHandle
// stop propagation on their own presses, so this only fires on bare media.
function onRootPointerDown(event: PointerEvent): void {
  if (localRect.value !== null) return;
  beginCreate(event, rootEl.value ?? null);
}

// ── keyboard nudges ───────────────────────────────────────────────────────────
function nudgeMove(dx: number, dy: number): void {
  if (disabled || localRect.value === null) return;
  writeRect(moveRect(localRect.value, dx, dy, mediaSize.value, constrain), true);
}

function nudgeResize(handle: CropHandlePosition, dx: number, dy: number): void {
  if (disabled || localRect.value === null) return;
  const r = localRect.value;
  const left = r.x;
  const right = r.x + r.width;
  const top = r.y;
  const bottom = r.y + r.height;
  const isLeft = handle === 'top-left' || handle === 'left' || handle === 'bottom-left';
  const isRight = handle === 'top-right' || handle === 'right' || handle === 'bottom-right';
  const isTop = handle === 'top-left' || handle === 'top' || handle === 'top-right';
  const isBottom = handle === 'bottom-left' || handle === 'bottom' || handle === 'bottom-right';
  // Target = the dragged handle's current position + the delta.
  const px = isLeft ? left + dx : isRight ? right + dx : (left + right) / 2;
  const py = isTop ? top + dy : isBottom ? bottom + dy : (top + bottom) / 2;
  writeRect(resizeRect(r, handle, px, py, resizeOptions()), true);
}

provideCropContext({
  rect: localRect,
  isEmpty,
  units: toRef(() => units),
  direction,
  mediaSize,
  mediaPixels,
  constrain: toRef(() => constrain),
  grid: toRef(() => grid),
  disabled: toRef(() => disabled),
  aspectRatio: resolvedRatio,
  minWidth: toRef(() => minWidth),
  minHeight: toRef(() => minHeight),
  keyboardStepX: stepX,
  keyboardStepY: stepY,
  keyboardLargeStepX: largeStepX,
  keyboardLargeStepY: largeStepY,
  isCropping,
  setRect,
  nudgeMove,
  nudgeResize,
  beginMove,
  beginResize,
  beginCreate,
});

defineExpose({ rect: localRect, isEmpty, setRect });

// `defineExpose` precedes `useForwardExpose` so the composable merges the prior
// bindings instead of clobbering them. `currentElement` is the rendered Root —
// the media-sized surface every gesture projects against.
const { forwardRef, currentElement: rootEl } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :dir="direction"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-empty="isEmpty ? '' : undefined"
    :data-cropping="isCropping ? '' : undefined"
    @pointerdown="onRootPointerDown"
  >
    <slot :rect="localRect" :is-empty="isEmpty" :is-cropping="isCropping" />
  </Primitive>
</template>
