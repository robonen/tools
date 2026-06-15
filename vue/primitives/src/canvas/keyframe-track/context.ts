import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type { Direction } from '../../utilities/config-provider';
import type { UseSnappingReturn } from '../../internal/snapping';

/**
 * A single keyframe on the track's time axis.
 *
 * `time` is in seconds, `value` is the animated value (in `valueRange` space).
 * `easing` is the cubic-bezier control tuple `[x1, y1, x2, y2]` for the segment
 * that STARTS at this keyframe and runs to the next one in time order — the
 * implicit anchors are `(0,0)` and `(1,1)` (CSS `cubic-bezier` semantics). When
 * `easing` is absent the segment falls back to {@link DEFAULT_KEYFRAME_EASING}.
 */
export interface KeyframeTrackKeyframeData {
  /** Stable identity used as the `v-for` key, roving-focus handle, and selection id. */
  id: string;
  /** Time of the keyframe in seconds. */
  time: number;
  /** The animated value at this keyframe (in `valueRange` space). */
  value: number;
  /** Cubic-bezier control points `[x1, y1, x2, y2]` for the segment starting here. */
  easing?: [number, number, number, number];
}

/**
 * Default easing for a segment with no explicit `easing` tuple: a linear ramp
 * (`cubic-bezier(0, 0, 1, 1)`), so an un-eased segment interpolates straight.
 */
export const DEFAULT_KEYFRAME_EASING: readonly [number, number, number, number] = [0, 0, 1, 1];

/**
 * Context shared between `KeyframeTrackRoot` and its parts.
 *
 * Scalar props are exposed as plain `Ref<T>` — `KeyframeTrackRoot` builds them
 * with `toRef(() => prop)` (a reactive getter ref without an extra effect),
 * matching the slider / timeline / curve-editor convention. `projection` /
 * `invert` are stable closures safe on the pointer hot path.
 */
export interface KeyframeTrackContext {
  /** Stable id base for scoping DOM ids per track instance. */
  trackId: string;
  /** The live keyframes, sorted ascending by `time`. */
  keyframes: ComputedRef<KeyframeTrackKeyframeData[]>;
  /**
   * Memoized `id → array index` map over {@link keyframes}, rebuilt once per
   * change. Parts use it for O(1) id lookup instead of an O(n) `find`/`findIndex`
   * scan per part per frame (the whole-track cost stays O(n), not O(n²)).
   */
  indexById: ComputedRef<Map<string, number>>;
  /** Currently selected keyframe id (drives the easing editor + roving focus), or null. */
  selectedId: Ref<string | null>;
  /** The animated property name (for the a11y label). */
  property: Ref<string | undefined>;
  /** Whether keyframes move vertically to edit `value` (else single horizontal lane). */
  valueAxis: Ref<boolean>;
  /** Value domain `[min, max]` (the y-axis extent in `valueAxis` mode). */
  valueRange: Ref<readonly [number, number]>;
  /** Total track duration in seconds (auto / injected from a Timeline / explicit). */
  duration: ComputedRef<number>;
  /** Frame rate (timecode + frame snapping + keyboard nudge). */
  fps: Ref<number>;
  /** Keyboard nudge step in seconds. */
  step: Ref<number>;
  /** Large keyboard step in seconds (Shift+Arrow). */
  largeStep: Ref<number>;
  /** Value-axis keyboard nudge step (per Arrow Up/Down in `valueAxis` mode). */
  valueStep: Ref<number>;
  /** Whether keyframes may overlap in time (else neighbour-clamped to keep order). */
  allowOverlap: Ref<boolean>;
  /** Minimum time gap between neighbouring keyframes (seconds) when `allowOverlap` is false. */
  minTimeBetween: Ref<number>;
  /** Snapping master enable. */
  snapping: Ref<boolean>;
  /** Master interactivity / disabled switch. */
  disabled: Ref<boolean>;
  /** Resolved reading direction. */
  direction: ComputedRef<Direction>;
  /** Live width (px) of the lane; `projection` range is `[0, width]`. */
  laneWidth: Ref<number>;
  /** Live height (px) of the lane (used by `valueAxis` y-projection). */
  laneHeight: Ref<number>;

  // ── coordinate model ──────────────────────────────────────────────────────
  /** Project a time (seconds) to a pixel offset in the lane. Stable identity. */
  projection: (seconds: number) => number;
  /** Invert a pixel offset back to a time (seconds). Stable identity. */
  invert: (px: number) => number;
  /** Project a value to a pixel offset on the y-axis (value-up). Stable identity. */
  projectValue: (value: number) => number;
  /** Invert a y pixel offset back to a value. Stable identity. */
  invertValue: (px: number) => number;
  /** Format a time (seconds) as a wall-clock string. */
  formatTime: (seconds: number) => string;
  /** Snap a candidate time to the nearest snap target (frame grid). */
  snapTime: (seconds: number, exclude?: string) => number;
  /** The shared snap engine (frame-grid targets). */
  snapEngine: UseSnappingReturn;

  // ── data access ───────────────────────────────────────────────────────────
  /** True while a keyframe drag is in flight (blocks external sync clobber). */
  isMutating: Readonly<Ref<boolean>>;
  /** The id of the keyframe currently being dragged (or null). */
  draggingId: Readonly<Ref<string | null>>;
  /** Whether this track is nested inside a Timeline (renders as a `listitem`). */
  inTimeline: boolean;

  // ── sampling ──────────────────────────────────────────────────────────────
  /**
   * Sample the animated value at an arbitrary time: find the bracketing
   * keyframes and apply the segment easing via the spline. Constant outside the
   * keyframe range (and for 0 / 1 keyframes).
   */
  sampleAt: (time: number) => number;

  // ── selection ─────────────────────────────────────────────────────────────
  /** Select a keyframe by id (null clears). */
  select: (id: string | null) => void;

  // ── mutation ──────────────────────────────────────────────────────────────
  /** Insert a keyframe at `time` (value defaults to the sampled curve). Returns its id. */
  addKeyframe: (time: number, value?: number) => string | undefined;
  /** Remove a keyframe by id. */
  removeKeyframe: (id: string) => void;
  /** Move a keyframe (transient overlay while `mutating`; commit on settle). */
  moveKeyframe: (id: string, time: number, value?: number, mutating?: boolean) => void;
  /** Set the segment easing (cubic-bezier tuple) of the segment starting at `id`. */
  setEasing: (id: string, bezier: [number, number, number, number]) => void;
  /** Commit the in-flight transient mutation into the model (one commit). */
  commit: () => void;

  // ── roving focus registration ─────────────────────────────────────────────
  /** Register a keyframe element for roving focus. */
  registerKeyframeEl: (id: string, el: HTMLElement | null) => void;
  /** Focus the next/prev keyframe in time order from `fromId` (roving). */
  focusAdjacent: (fromId: string, direction: 1 | -1) => void;
  /** Focus a keyframe element by id. */
  focusKeyframe: (id: string) => void;
}

const ctx = useContextFactory<KeyframeTrackContext>('KeyframeTrackContext');

export const provideKeyframeTrackContext = ctx.provide;
export const useKeyframeTrackContext = ctx.inject;
