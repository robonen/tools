<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { WaveformDirection, WaveformProjection, WaveformTimeFormatter } from './context';
import type { WaveformMode, WaveformPeaksRange, WaveformRegionData } from './utils';

/**
 * A headless audio waveform: it renders amplitude peaks as bars (or a smoothed
 * path), overlays a draggable playback cursor, and hosts zero or more draggable
 * regions (selections). The root owns the peaks, the `currentTime` model, and
 * the `regions` model; it measures its own width, builds a time↔pixel
 * projection over the visible window (`offset` + `zoom` for timeline sync), and
 * resamples `peaks` to the available bar count by ratio (never assuming one peak
 * per pixel). Pointer-down on the body scrubs the cursor; with
 * `createRegionOnDrag` a press-drag marquees out a new region. It provides
 * context to `WaveformBars`/`WaveformPath`, `WaveformCursor`, `WaveformRegion`,
 * `WaveformSelectionPreview`, and `WaveformEmpty`. Reach for it to visualize and
 * navigate audio (players, trimmers, transcript editors).
 */
export interface WaveformRootProps extends PrimitiveProps {
  /**
   * Per-sample amplitudes. Either normalized `0..1` magnitudes or signed
   * `-1..1` PCM-style samples — select which via `peaksRange`. Length is
   * decoupled from `duration`: the root resamples by ratio to the bar count.
   * @default []
   */
  peaks?: number[] | Float32Array;
  /**
   * The amplitude convention of `peaks`. `'-1..1'` (signed) is rectified via
   * absolute value; `'0..1'` is passed through.
   * @default '-1..1'
   */
  peaksRange?: WaveformPeaksRange;
  /** Total media duration, in seconds. @default 0 */
  duration?: number;
  /** Current playback position in seconds (`v-model:current-time`). @default 0 */
  currentTime?: number;
  /** The set of regions (`v-model:regions`). @default [] */
  regions?: WaveformRegionData[];
  /**
   * Left edge of the visible window, in seconds (for timeline sync). @default 0
   */
  offset?: number;
  /**
   * Horizontal zoom in pixels-per-second. `0` means "fit": the whole
   * `[offset, duration]` span fills the measured width. @default 0
   */
  zoom?: number;
  /** Bar thickness in pixels (bars mode). @default 2 */
  barWidth?: number;
  /** Gap between bars in pixels (bars mode). @default 1 */
  barGap?: number;
  /** Body render strategy. @default 'bars' */
  mode?: WaveformMode;
  /** A press-drag on the body marquees out a new region instead of seeking. @default false */
  createRegionOnDrag?: boolean;
  /**
   * Keyboard step for the cursor / region edges, in seconds. `0` means "1 pixel
   * of time" — resolved from the current projection. @default 0
   */
  step?: number;
  /** Large keyboard step (Shift+Arrow), in seconds. @default step × 10 (or 1px×10) */
  largeStep?: number;
  /** Default formatter for the cursor's `aria-valuetext`. @default formatClock */
  timeFormatter?: WaveformTimeFormatter;
  /** Mark the waveform as loading async peaks (sets `data-loading`). @default false */
  loading?: boolean;
  /** Disable all interaction. @default false */
  disabled?: boolean;
  /**
   * Writing direction. When omitted it is inherited from the nearest
   * `ConfigProvider` (falling back to `'ltr'`); an explicit value wins.
   */
  dir?: WaveformDirection;
}

export interface WaveformRootEmits {
  /** A scrub / keyboard seek settled. */
  seekCommit: [time: number];
  /** A new region was created (via `createRegionOnDrag`). */
  regionCreate: [region: WaveformRegionData];
  /** A region's bounds changed (drag/keyboard) and settled. */
  regionUpdate: [region: WaveformRegionData];
  /** A region was removed. */
  regionRemove: [id: string];
}
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from 'vue';
import { useElementSize } from '@robonen/vue';
import { clamp } from '@robonen/stdlib';
import { Primitive } from '../../internal/primitive';
import { formatClock, useScale } from '../../internal/scale';
import { useDirection } from '../../utilities/config-provider';
import { usePointerDrag } from '../../internal/pointer-drag';
import { provideWaveformContext } from './context';
import { buildBars } from './utils';

const {
  peaks = [],
  peaksRange = '-1..1',
  duration = 0,
  offset = 0,
  zoom = 0,
  barWidth = 2,
  barGap = 1,
  mode = 'bars',
  createRegionOnDrag = false,
  step = 0,
  largeStep,
  timeFormatter = formatClock,
  loading = false,
  disabled = false,
  dir,
  as = 'div',
} = defineProps<WaveformRootProps>();

const emit = defineEmits<WaveformRootEmits>();

const currentTimeModel = defineModel<number>('currentTime', { default: 0 });
const regionsModel = defineModel<WaveformRegionData[]>('regions', { default: () => [] });

// Internal local mirrors of the models. `defineModel` in fully-controlled mode
// returns the incoming PROP from its getter until the parent re-renders, so two
// synchronous writes (e.g. rapid key presses or a pointer drag) would both read
// the stale value. The locals are written immediately and pushed to the model;
// a watch keeps them in sync when the parent drives the value. (Same pattern as
// SliderRoot's `localValues`.)
const localTime = shallowRef<number>(currentTimeModel.value ?? 0);
watch(currentTimeModel, (v) => {
  if (v !== null && v !== undefined && v !== localTime.value) localTime.value = v;
});

const localRegions = shallowRef<WaveformRegionData[]>(regionsModel.value ?? []);
watch(regionsModel, (v) => {
  if (v && v !== localRegions.value) localRegions.value = v;
});

const direction = useDirection(() => dir);
const signed = computed(() => peaksRange === '-1..1');

// ── width measurement ────────────────────────────────────────────────────
// Manual element ref (no `useForwardExpose`): the root owns its own element and
// exposes a custom imperative API via a single `defineExpose` below, so a manual
// ref avoids the double-`expose()` warning `useForwardExpose` would cause when
// paired with `defineExpose`. `Primitive`'s `:ref` resolves to the DOM node (or
// a component instance whose `$el` we read).
const bodyEl = shallowRef<HTMLElement | null>(null);
function setRootRef(el: unknown): void {
  if (el === null || el === undefined) {
    bodyEl.value = null;
    return;
  }
  if (el instanceof HTMLElement) {
    bodyEl.value = el;
    return;
  }
  const inst = el as { $el?: unknown };
  bodyEl.value = inst.$el instanceof HTMLElement ? inst.$el : null;
}

const { width } = useElementSize(bodyEl);

// ── visible window + projection ──────────────────────────────────────────
const isEmpty = computed(() => duration <= 0 || peaks.length === 0);

// `zoom` (px/sec) sets the window width; `0` → fit the remaining duration.
const windowRange = computed<readonly [number, number]>(() => {
  const start = offset > 0 ? offset : 0;
  if (duration <= 0) return [0, 0];
  if (zoom > 0) {
    const w = width.value;
    const span = w > 0 ? w / zoom : duration - start;
    const end = Math.min(start + span, duration);
    return [start, end > start ? end : start];
  }
  return [start, duration];
});

const scale = useScale({
  domain: windowRange,
  range: () => [0, width.value],
  // ltr → start at left; rtl flips horizontally.
  rtl: () => direction.value === 'rtl',
  clamp: true,
});

const projection: WaveformProjection = {
  scale: scale.scale,
  invert: scale.invert,
};

// One pixel of time, for `step: 0` resolution and PageUp/Down windows.
const pxToTime = computed(() => {
  const ppu = scale.pxPerUnit.value;
  return ppu > 0 ? 1 / ppu : 0;
});
const resolvedStep = computed(() => (step > 0 ? step : pxToTime.value || 0.01));
const resolvedLargeStep = computed(() => (largeStep !== undefined && largeStep > 0 ? largeStep : resolvedStep.value * 10));

// ── buckets (bar geometry) ───────────────────────────────────────────────
// Resampled BY RATIO across the visible window's sample slice. When peaks map
// to the whole duration, the window's sample slice is its time fraction.
const buckets = computed(() => {
  if (mode !== 'bars') return [];
  const w = width.value;
  if (w <= 0 || isEmpty.value) return [];
  const len = peaks.length;
  const [ws, we] = windowRange.value;
  const dur = duration;
  // Map the visible time window onto the peaks index window by ratio.
  const sampleStart = dur > 0 ? Math.floor((ws / dur) * len) : 0;
  const sampleEnd = dur > 0 ? Math.ceil((we / dur) * len) : len;
  return buildBars(peaks, w, barWidth, barGap, signed.value, sampleStart, sampleEnd);
});

// ── currentTime ──────────────────────────────────────────────────────────
const currentTime = computed(() => clamp(localTime.value ?? 0, 0, duration > 0 ? duration : 0));

function seek(seconds: number, commit = false): void {
  if (disabled) return;
  const next = clamp(Number.isFinite(seconds) ? seconds : 0, 0, duration > 0 ? duration : 0);
  if (next !== localTime.value) {
    localTime.value = next;
    currentTimeModel.value = next;
  }
  if (commit) emit('seekCommit', next);
}

// ── regions ──────────────────────────────────────────────────────────────
// Named `regionList` (not `regions`) to avoid colliding with the `regions`
// prop/model name (`vue/no-dupe-keys`).
const regionList = computed(() => localRegions.value ?? []);

function setRegions(next: WaveformRegionData[]): void {
  localRegions.value = next;
  regionsModel.value = next;
}

let regionSeq = 0;
function nextId(): string {
  regionSeq += 1;
  return `waveform-region-${Date.now().toString(36)}-${regionSeq}`;
}

function clampTime(t: number): number {
  return clamp(Number.isFinite(t) ? t : 0, 0, duration > 0 ? duration : 0);
}

function addRegion(region: Partial<WaveformRegionData> & { start: number; end: number }): string {
  const id = region.id ?? nextId();
  let start = clampTime(region.start);
  let end = clampTime(region.end);
  if (end < start) [start, end] = [end, start];
  const created: WaveformRegionData = { id, start, end, label: region.label, color: region.color };
  setRegions([...regionList.value, created]);
  emit('regionCreate', created);
  return id;
}

function updateRegion(id: string, patch: Partial<Omit<WaveformRegionData, 'id'>>, commit = false): void {
  if (disabled) return;
  const list = regionList.value;
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return;
  const prev = list[idx]!;
  let start = patch.start !== undefined && patch.start !== null ? clampTime(patch.start) : prev.start;
  let end = patch.end !== undefined && patch.end !== null ? clampTime(patch.end) : prev.end;
  if (end < start) [start, end] = [end, start];
  const merged: WaveformRegionData = {
    ...prev,
    start,
    end,
    label: patch.label !== undefined ? patch.label : prev.label,
    color: patch.color !== undefined ? patch.color : prev.color,
  };
  if (merged.start === prev.start && merged.end === prev.end && merged.label === prev.label && merged.color === prev.color) {
    if (commit) emit('regionUpdate', merged);
    return;
  }
  const next = list.slice();
  next[idx] = merged;
  setRegions(next);
  if (commit) emit('regionUpdate', merged);
}

function removeRegion(id: string): void {
  if (disabled) return;
  const list = regionList.value;
  if (!list.some(r => r.id === id)) return;
  setRegions(list.filter(r => r.id !== id));
  emit('regionRemove', id);
}

// ── cursor registration (so the root can drive focus / window paging) ──────
const cursorEl = shallowRef<HTMLElement | null>(null);
function registerCursor(el: HTMLElement | null): void {
  cursorEl.value = el;
}

// ── pointer interaction on the body ────────────────────────────────────────
// Selection preview state (create-region marquee in flight).
const previewActive = shallowRef(false);
const previewStart = shallowRef(0);
const previewEnd = shallowRef(0);
let pendingRegion = false;

function timeFromClientX(clientX: number, rect?: DOMRect): number {
  const r = rect ?? bodyEl.value?.getBoundingClientRect();
  if (!r || r.width === 0) return 0;
  return projection.invert(clientX - r.left);
}

// Body rect snapshotted at gesture start: it cannot change mid-drag, so caching
// it removes a getBoundingClientRect reflow on every scrub/region onMove frame.
let gestureRect: DOMRect | undefined;

usePointerDrag(bodyEl, {
  axis: 'x',
  threshold: createRegionOnDrag ? 3 : 0,
  disabled: () => disabled || isEmpty.value,
  preventDefault: true,
  onStart: (state) => {
    if (disabled || isEmpty.value) return false;
    gestureRect = bodyEl.value?.getBoundingClientRect();
    if (createRegionOnDrag) {
      const t = timeFromClientX(state.startPoint.x, gestureRect);
      previewStart.value = t;
      previewEnd.value = t;
      previewActive.value = true;
      pendingRegion = true;
    }
    else {
      // Immediate scrub: seek to the press point.
      seek(timeFromClientX(state.startPoint.x, gestureRect));
    }
    return undefined;
  },
  onMove: (state) => {
    const t = timeFromClientX(state.point.x, gestureRect);
    if (pendingRegion) previewEnd.value = t;
    else seek(t);
  },
  onEnd: () => {
    gestureRect = undefined;
    if (pendingRegion) {
      previewActive.value = false;
      pendingRegion = false;
    }
  },
  onCommit: () => {
    if (createRegionOnDrag) {
      const a = previewStart.value;
      const b = previewEnd.value;
      if (Math.abs(b - a) > 0) addRegion({ start: Math.min(a, b), end: Math.max(a, b) });
    }
    else {
      emit('seekCommit', currentTime.value);
    }
  },
});

// ── keyboard window paging (PageUp/PageDown seek by one visible window) ─────
function pageSeconds(): number {
  const [ws, we] = windowRange.value;
  const span = we - ws;
  return span > 0 ? span : duration;
}

// expose helpers consumed by the cursor for window-based paging
const windowSpan = computed(() => pageSeconds());

const preview = computed(() => ({
  active: previewActive.value,
  start: previewStart.value,
  end: previewEnd.value,
}));

provideWaveformContext({
  peaks: toRef(() => peaks as ArrayLike<number>),
  signed,
  duration: toRef(() => duration),
  currentTime,
  regions: regionList,
  width,
  direction,
  disabled: toRef(() => disabled),
  step: resolvedStep,
  largeStep: resolvedLargeStep,
  timeFormatter: toRef(() => timeFormatter),
  window: windowRange,
  projection,
  buckets,
  isEmpty,
  loading: toRef(() => loading),
  preview,
  seek,
  addRegion,
  updateRegion,
  removeRegion,
  registerCursor,
});

defineExpose({
  currentTime,
  regions: regionList,
  seek,
  addRegion,
  updateRegion,
  removeRegion,
});
</script>

<template>
  <Primitive
    :ref="setRootRef"
    :as="as"
    :dir="direction"
    data-waveform-root=""
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-empty="isEmpty ? '' : undefined"
    :data-loading="loading ? '' : undefined"
    :data-creating="previewActive ? '' : undefined"
  >
    <slot
      :current-time="currentTime"
      :regions="regionList"
      :duration="duration"
      :is-empty="isEmpty"
      :loading="loading"
      :width="width"
      :preview="{ active: previewActive, start: previewStart, end: previewEnd }"
      :window-span="windowSpan"
    />
  </Primitive>
</template>
