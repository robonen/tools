import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type { WaveformBar, WaveformRegionData } from './utils';

/** Writing direction for the waveform body. */
export type WaveformDirection = 'ltr' | 'rtl';

/** Formats a time (seconds) into a human string for `aria-valuetext`. */
export type WaveformTimeFormatter = (seconds: number) => string;

/**
 * The value↔pixel projection exposed to descendants: `scale` maps a time (s) to
 * a pixel x within the body, `invert` maps a pixel x back to a time. Mirrors the
 * subset of {@link import('../../internal/scale').useScale} that parts consume.
 */
export interface WaveformProjection {
  /** Project a time (seconds) to a pixel x within the body. */
  scale: (seconds: number) => number;
  /** Invert a pixel x within the body back to a time (seconds). */
  invert: (px: number) => number;
}

/**
 * Context shared between `WaveformRoot` and its descendants.
 *
 * Scalar props are plain `Ref<T>` (built with `toRef(() => prop)` in the root —
 * a `GetterRefImpl` that is reactive without allocating an effect). `buckets`
 * and `projection` are derived and read on every render of the body.
 */
export interface WaveformContext {
  /** Source per-sample amplitudes (passthrough of the `peaks` prop). */
  peaks: Ref<ArrayLike<number>>;
  /** Whether `peaks` are signed (`'-1..1'`) and must be rectified. */
  signed: Ref<boolean>;
  /** Total media duration, in seconds. */
  duration: Ref<number>;
  /** Current playback position (seconds), clamped to `[0, duration]`. */
  currentTime: Ref<number>;
  /** The current set of regions. */
  regions: Ref<WaveformRegionData[]>;
  /** Measured body width, in pixels. */
  width: Ref<number>;
  /** Effective writing direction. */
  direction: Ref<WaveformDirection>;
  /** Whether interaction is disabled. */
  disabled: Ref<boolean>;
  /** Keyboard step for the cursor / region edges, in seconds. */
  step: Ref<number>;
  /** Large keyboard step (Shift+Arrow), in seconds. */
  largeStep: Ref<number>;
  /** Default formatter for cursor `aria-valuetext`. */
  timeFormatter: Ref<WaveformTimeFormatter>;

  /** The visible time window `[start, end]` (seconds). */
  window: ComputedRef<readonly [number, number]>;
  /** Time↔pixel projection over the visible window → `[0, width]`. */
  projection: WaveformProjection;
  /** Computed bar geometry, resampled by ratio for the current width. */
  buckets: ComputedRef<WaveformBar[]>;
  /** `true` when duration is 0 or there are no peaks. */
  isEmpty: ComputedRef<boolean>;
  /** `true` while peaks are loading (async fetch). */
  loading: Ref<boolean>;
  /** The transient create-region marquee (only meaningful while `active`). */
  preview: ComputedRef<{ active: boolean; start: number; end: number }>;

  /** Seek to a time (seconds); clamps to bounds and emits a commit. */
  seek: (seconds: number, commit?: boolean) => void;
  /** Append a new region (id auto-generated when omitted); returns its id. */
  addRegion: (region: Partial<WaveformRegionData> & { start: number; end: number }) => string;
  /** Patch an existing region by id (start/end re-ordered & clamped). */
  updateRegion: (id: string, patch: Partial<Omit<WaveformRegionData, 'id'>>, commit?: boolean) => void;
  /** Remove a region by id. */
  removeRegion: (id: string) => void;

  /** Register the cursor element so the root can drive focus/keyboard. */
  registerCursor: (el: HTMLElement | null) => void;
}

const ctx = useContextFactory<WaveformContext>('WaveformContext');

export const provideWaveformContext = ctx.provide;
export const useWaveformContext = ctx.inject;

/** Which edge of a region a `WaveformRegionHandle` trims. */
export type WaveformRegionEdge = 'start' | 'end';

/**
 * Context provided by `WaveformRegion` to its two `WaveformRegionHandle`
 * children so each handle knows the region's id and current bounds and can trim
 * the correct edge.
 */
export interface WaveformRegionContext {
  /** The region's stable id. */
  id: Ref<string>;
  /** Live region bounds `{ start, end }` in seconds. */
  start: Ref<number>;
  end: Ref<number>;
  /** Whether this region is the selected/active one. */
  selected: Ref<boolean>;
  /** Trim one edge to `seconds`; the root re-orders & clamps. */
  trim: (edge: WaveformRegionEdge, seconds: number, commit?: boolean) => void;
}

const regionCtx = useContextFactory<WaveformRegionContext>('WaveformRegionContext');

export const provideWaveformRegionContext = regionCtx.provide;
export const useWaveformRegionContext = regionCtx.inject;
