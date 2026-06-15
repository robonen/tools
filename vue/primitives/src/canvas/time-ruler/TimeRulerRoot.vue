<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { TimeRulerDirection, TimeRulerMode } from './context';

/**
 * A headless, zoomable time axis: a horizontal ruler of ticks and labels over a
 * span of `duration` seconds. It renders the accessible `group` (region when
 * labelled), measures its own width, and builds a `useScale` whose domain is the
 * visible time window `[offset, offset + width / zoom]` and range `[0, width]`.
 *
 * The visible window is driven by two models — `offset` (the left-edge time in
 * seconds, `v-model:offset`) and `zoom` (pixels-per-second, `v-model:zoom`) —
 * which stream continuously while panning / zooming; the root additionally emits
 * SETTLE events (`panCommit`, `zoomCommit`, `rangeChange`) when a gesture ends.
 *
 * Tick generation is selected by `mode`: `'seconds'` uses the human time ladder,
 * `'timecode'` renders `HH:MM:SS:FF` SMPTE labels at `fps` (drop-frame optional),
 * and `'frames'` renders integer frame numbers. When focusable the root handles
 * a keyboard layer (Arrow keys pan, Shift+Arrow pans by a major interval, `+` /
 * `-` zoom about the canvas centre) and optional wheel / drag panning.
 *
 * It is usable standalone or embedded in a `Timeline` via `TimeRulerContext`,
 * which exposes the tick collections, the `scale` / `invert` projectors, the
 * `offset` / `zoom` models, and the `formatTime` helper. The default slot
 * surfaces `{ ticks, majorTicks, minorTicks, scale, formatTime }` so consumers
 * can render their own tick layer; the `TimeRuler*` parts are opt-in.
 */
export interface TimeRulerRootProps extends PrimitiveProps {
  /** Total content duration in seconds. @default 0 */
  duration?: number;
  /** Frame rate used by `'timecode'` / `'frames'` modes. @default 30 */
  fps?: number;
  /** How tick labels are rendered. @default 'seconds' */
  mode?: TimeRulerMode;
  /** Use drop-frame timecode labels (only meaningful in `'timecode'` mode). @default false */
  dropFrame?: boolean;
  /** Minimum zoom in pixels-per-second; `zoom` is clamped to this. @default 1 */
  minZoom?: number;
  /** Maximum zoom in pixels-per-second; `zoom` is clamped to this. @default 4000 */
  maxZoom?: number;
  /** Disable all interaction (keyboard, wheel, drag). @default false */
  disabled?: boolean;
  /**
   * Writing direction. When omitted it is inherited from the nearest
   * `ConfigProvider` (falling back to `'ltr'`); an explicit value wins.
   */
  dir?: TimeRulerDirection;
  /** Target pixel spacing between adjacent ticks, forwarded to the tick generator. @default 80 */
  targetDensity?: number;
  /** Make the ruler focusable and enable the keyboard layer. @default false */
  focusable?: boolean;
  /** Enable wheel panning (and ctrl/cmd+wheel zoom about the pointer). @default false */
  wheel?: boolean;
  /** Enable drag-to-pan (x-only). @default false */
  draggable?: boolean;
}

// Note: `update:offset` / `update:zoom` are declared by their `defineModel`s and
// must NOT be re-declared here (a duplicate emit collapses the handler type to
// `unknown[]`). These are the SETTLE-only events.
export interface TimeRulerRootEmits {
  /** Emitted when a pan gesture settles, with the final `offset` (seconds). */
  panCommit: [offset: number];
  /** Emitted when a zoom gesture settles, with the final `zoom` (px/s). */
  zoomCommit: [zoom: number];
  /** Emitted when the visible window settles, with `[start, end]` in seconds. */
  rangeChange: [range: [number, number]];
}
</script>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { clamp } from '@robonen/stdlib';
import { useElementSize, useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useScale } from '../../internal/scale';
import type { TickKind } from '../../internal/scale';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useDirection } from '../../utilities/config-provider';
import { provideTimeRulerContext } from './context';
import { formatTimeForMode, modeToTickKind, tickFormatFor } from './utils';

const {
  duration = 0,
  fps = 30,
  mode = 'seconds',
  dropFrame = false,
  minZoom = 1,
  maxZoom = 4000,
  disabled = false,
  dir,
  targetDensity = 80,
  focusable = false,
  wheel = false,
  draggable = false,
  as = 'div',
} = defineProps<TimeRulerRootProps>();

const emit = defineEmits<TimeRulerRootEmits>();

const direction = useDirection(() => dir);
const isRtl = computed(() => direction.value === 'rtl');

// Local element ref used for measurement, pointer rect, and drag binding. It is
// kept independent of `useForwardExpose` so `defineExpose` can run BEFORE
// `useForwardExpose` (else Vue warns "expose() called only once" and clobbers
// the merged `$el` / props). The template wires BOTH this ref and `forwardRef`.
const rootEl = shallowRef<HTMLElement>();

// The ruler measures its own width; `useScale`'s range is `[0, width]`.
const { width } = useElementSize(rootEl);

// `offset` / `zoom` are the two visible-window models. They stream continuously;
// `defineModel` emits `update:offset` / `update:zoom` on write.
const offset = defineModel<number>('offset', { default: 0 });
const zoom = defineModel<number>('zoom', {
  default: 100,
  // Always present a clamped zoom; clamping in the getter keeps an out-of-range
  // controlled value from leaking into the scale geometry.
  get: external => clamp(external, minZoom, maxZoom),
});

const isPanning = shallowRef(false);
const isZooming = shallowRef(false);

// Pixels-per-second, guarded against degenerate zoom.
const pxPerSecond = computed(() => Math.max(zoom.value, 1e-6));

// Visible window in seconds: `[offset, offset + width / zoom]`.
const visibleStart = computed(() => offset.value);
const visibleEnd = computed(() => offset.value + width.value / pxPerSecond.value);

const tickKind = computed<TickKind>(() => modeToTickKind(mode));

const tickOptions = computed(() => ({
  fps,
  dropFrame,
  targetDensity,
  format: tickFormatFor(mode, fps),
}));

const {
  ticks,
  majorTicks,
  minorTicks,
  scale,
  invert,
} = useScale({
  domain: () => [visibleStart.value, visibleEnd.value] as const,
  range: () => [0, width.value] as const,
  // RTL flips the horizontal mapping so the timeline reads right-to-left.
  rtl: () => isRtl.value,
  tickKind: () => tickKind.value,
  tickOptions: () => tickOptions.value,
});

function formatTime(seconds: number): string {
  return formatTimeForMode(seconds, mode, fps, dropFrame);
}

// --- Pan / zoom helpers -----------------------------------------------------

/** Largest seconds-clamp so the window never scrolls entirely past the content. */
function clampOffset(next: number): number {
  if (duration <= 0) return Math.max(0, next);
  const windowSpan = width.value / pxPerSecond.value;
  // Allow scrolling until the window's left edge reaches the end of content,
  // but never before zero.
  const maxOffset = Math.max(0, duration - windowSpan);
  // When the window is wider than the content, pin to 0.
  if (windowSpan >= duration) return 0;
  return clamp(next, 0, maxOffset);
}

function setOffset(next: number): void {
  const clamped = clampOffset(next);
  if (clamped !== offset.value) offset.value = clamped;
}

function setZoom(next: number, anchorSeconds?: number): void {
  const clamped = clamp(next, minZoom, maxZoom);
  if (clamped === zoom.value) return;
  // Zoom about an anchor time: keep `anchorSeconds` under the same LOCAL pixel.
  // The local pixel under the OLD geometry is `scale(anchorSeconds)`; solve the
  // projection for the new offset under the new zoom (RTL flips the axis):
  //   ltr: px = (t - O') * z'           → O' = t - px / z'
  //   rtl: px = width - (t - O') * z'    → O' = t - (width - px) / z'
  if (anchorSeconds !== undefined && width.value > 0) {
    const px = scale(anchorSeconds);
    const newOffset = isRtl.value
      ? anchorSeconds - (width.value - px) / clamped
      : anchorSeconds - px / clamped;
    zoom.value = clamped;
    setOffset(newOffset);
  }
  else {
    zoom.value = clamped;
  }
}

/** Minor / major tick intervals in seconds (for keyboard pan steps). */
const minorInterval = computed(() => {
  const t = minorTicks.value;
  if (t.length >= 2) return Math.abs(t[1]!.value - t[0]!.value);
  const all = ticks.value;
  if (all.length >= 2) return Math.abs(all[1]!.value - all[0]!.value);
  // Fall back to one pixel-equivalent second.
  return 1 / pxPerSecond.value;
});
const majorInterval = computed(() => {
  const t = majorTicks.value;
  if (t.length >= 2) return Math.abs(t[1]!.value - t[0]!.value);
  return minorInterval.value * 5;
});

// --- Settle (commit) plumbing ----------------------------------------------

function emitRangeChange(): void {
  emit('rangeChange', [visibleStart.value, visibleEnd.value]);
}

function commitPan(): void {
  if (!isPanning.value) return;
  isPanning.value = false;
  emit('panCommit', offset.value);
  emitRangeChange();
}

function commitZoom(): void {
  if (!isZooming.value) return;
  isZooming.value = false;
  emit('zoomCommit', zoom.value);
  emitRangeChange();
}

// --- Keyboard layer ---------------------------------------------------------

function onKeydown(event: KeyboardEvent): void {
  if (disabled || !focusable) return;

  const { key, shiftKey } = event;
  const altZoom = event.ctrlKey || event.metaKey;
  // In RTL, ArrowLeft should move the window the opposite way.
  const dirSign = isRtl.value ? -1 : 1;

  switch (key) {
    case 'ArrowLeft':
    case 'ArrowRight': {
      event.preventDefault();
      const forward = key === 'ArrowRight' ? 1 : -1;
      if (altZoom) {
        // Ctrl/Cmd+Arrow → zoom about centre (alt zoom gesture).
        isZooming.value = true;
        const factor = forward === 1 ? 1.2 : 1 / 1.2;
        const centre = invert(width.value / 2);
        setZoom(zoom.value * factor, centre);
        commitZoom();
      }
      else {
        isPanning.value = true;
        const step = shiftKey ? majorInterval.value : minorInterval.value;
        setOffset(offset.value + forward * dirSign * step);
        commitPan();
      }
      break;
    }
    case '+':
    case '=': {
      event.preventDefault();
      isZooming.value = true;
      const centre = invert(width.value / 2);
      setZoom(zoom.value * 1.2, centre);
      commitZoom();
      break;
    }
    case '-':
    case '_': {
      event.preventDefault();
      isZooming.value = true;
      const centre = invert(width.value / 2);
      setZoom(zoom.value / 1.2, centre);
      commitZoom();
      break;
    }
    default:
      break;
  }
}

// --- Wheel (optional) -------------------------------------------------------

function onWheel(event: WheelEvent): void {
  if (disabled || !wheel) return;
  event.preventDefault();
  if (event.ctrlKey || event.metaKey) {
    // ctrl/cmd+wheel → zoom about the pointer.
    isZooming.value = true;
    const el = rootEl.value;
    const rect = el?.getBoundingClientRect();
    const localX = rect ? event.clientX - rect.left : width.value / 2;
    const anchor = invert(isRtl.value ? width.value - localX : localX);
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom(zoom.value * factor, anchor);
    commitZoom();
  }
  else {
    isPanning.value = true;
    const deltaPx = event.deltaX !== 0 ? event.deltaX : event.deltaY;
    const dirSign = isRtl.value ? -1 : 1;
    setOffset(offset.value + (deltaPx / pxPerSecond.value) * dirSign);
    commitPan();
  }
}

// --- Drag-to-pan (optional, x-only) ----------------------------------------

let dragStartOffset = 0;

usePointerDrag(() => (draggable && !disabled ? rootEl.value ?? null : null), {
  axis: 'x',
  disabled: () => disabled || !draggable,
  onStart: () => {
    dragStartOffset = offset.value;
    isPanning.value = true;
  },
  onMove: (state) => {
    const dirSign = isRtl.value ? 1 : -1;
    setOffset(dragStartOffset + (state.total.x / pxPerSecond.value) * dirSign);
  },
  onEnd: () => {
    commitPan();
  },
});

// Re-clamp the offset when geometry that bounds it changes (a wider window or a
// shorter duration can push the current offset out of range).
watch([width, pxPerSecond, () => duration], () => {
  setOffset(offset.value);
});

provideTimeRulerContext({
  ticks,
  majorTicks,
  minorTicks,
  scale,
  invert,
  offset,
  zoom,
  duration: computed(() => duration),
  fps: computed(() => fps),
  mode: computed(() => mode),
  formatTime,
  isPanning,
  isZooming,
  disabled: computed(() => disabled),
});

// `defineExpose` MUST precede `useForwardExpose` so the composable merges these
// bindings (plus props + `$el`) instead of `expose()` clobbering them.
defineExpose({
  ticks,
  majorTicks,
  minorTicks,
  scale,
  invert,
  formatTime,
  offset,
  zoom,
});

const { forwardRef } = useForwardExpose();

// Combine `forwardRef` (consumer-facing expose/`$el` forwarding) with our local
// `rootEl` (measurement / pointer rect) into one `:ref`.
function setRootRef(el: unknown): void {
  forwardRef(el as never);
  rootEl.value = (el && '$el' in (el as object) ? (el as { $el: HTMLElement }).$el : el) as HTMLElement | undefined;
}
</script>

<template>
  <Primitive
    :ref="setRootRef"
    :as="as"
    role="group"
    aria-orientation="horizontal"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    data-orientation="horizontal"
    :data-panning="isPanning ? '' : undefined"
    :data-zooming="isZooming ? '' : undefined"
    :dir="direction"
    :tabindex="focusable && !disabled ? 0 : undefined"
    @keydown="onKeydown"
    @wheel="onWheel"
  >
    <slot
      :ticks="ticks"
      :major-ticks="majorTicks"
      :minor-ticks="minorTicks"
      :scale="scale"
      :format-time="formatTime"
    />
  </Primitive>
</template>
