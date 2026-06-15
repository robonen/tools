import type { Ref } from 'vue';
import type { Point } from '../../internal/utils/geometry';
import type { UseScaleReturn } from '../../internal/scale';
import { useContextFactory } from '@robonen/vue';

export type CurveEditorDirection = 'ltr' | 'rtl';

/**
 * How the curve is interpolated between anchors.
 * - `'linear'` — straight segments (piecewise-linear).
 * - `'bezier'` — per-anchor cubic tangents (`inHandle`/`outHandle`), solved for
 *   `x` so the curve stays a function of `x`.
 * - `'monotone'` — Fritsch-Carlson monotone cubic (no overshoot; the tone/gamma
 *   default).
 * - `'catmull-rom'` — Catmull-Rom spline through the anchors.
 */
export type CurveEditorInterpolation = 'linear' | 'bezier' | 'monotone' | 'catmull-rom';

/**
 * Which curve is being edited. For animation easing this is always `'value'`;
 * for photo tone curves the consumer switches between the composite `'value'`
 * curve and the per-channel `'r'`/`'g'`/`'b'` curves. The channel only tags the
 * curve (for styling / the `#channel` slot) — it does not change the maths.
 */
export type CurveEditorChannel = 'value' | 'r' | 'g' | 'b';

/**
 * A single control point on the curve.
 *
 * `x`/`y` are in domain space (`domainX`/`domainY`). `inHandle`/`outHandle` are
 * bezier tangents **relative** to the anchor (deltas, not absolute points) and
 * are only consulted in `'bezier'` interpolation.
 */
export interface CurveEditorAnchor {
  /** Stable identity used as the `v-for` key and roving-focus handle. */
  id: string;
  /** Input coordinate in `domainX` space. */
  x: number;
  /** Output coordinate in `domainY` space. */
  y: number;
  /** Incoming bezier tangent, relative to the anchor (`'bezier'` mode only). */
  inHandle?: Point;
  /** Outgoing bezier tangent, relative to the anchor (`'bezier'` mode only). */
  outHandle?: Point;
}

/**
 * Which tangent handle of an anchor a `CurveEditorHandle` controls.
 */
export type CurveEditorHandleSide = 'in' | 'out';

/**
 * Context shared between `CurveEditorRoot` and its descendants.
 *
 * Scalar props are exposed as plain `Ref<T>` — `CurveEditorRoot` builds them
 * with `toRef(() => prop)` (a reactive getter ref without an extra effect),
 * matching the slider / color-area convention.
 */
export interface CurveEditorContext {
  /** The live anchor array (sorted ascending by `x`). */
  anchors: Ref<CurveEditorAnchor[]>;
  /** Active interpolation mode. */
  interpolation: Ref<CurveEditorInterpolation>;
  /** Input (x) domain `[min, max]`. */
  domainX: Ref<readonly [number, number]>;
  /** Output (y) domain `[min, max]`. */
  domainY: Ref<readonly [number, number]>;
  /** x-axis value↔pixel projection (horizontal). */
  scaleX: UseScaleReturn;
  /** y-axis value↔pixel projection (vertical, value-up). */
  scaleY: UseScaleReturn;
  /** Channel tag for styling / the `#channel` slot. */
  channel: Ref<CurveEditorChannel>;
  /** Keyboard step for x/y nudges. */
  step: Ref<number>;
  /** Large keyboard step (Shift+Arrow / Page keys). */
  largeStep: Ref<number>;
  /** Whether x is kept single-valued (neighbour-clamped, anchors can't cross). */
  monotonicX: Ref<boolean>;
  /** Whether the first/last anchor are locked in x. */
  fixedEndpoints: Ref<boolean>;
  direction: Ref<CurveEditorDirection>;
  disabled: Ref<boolean>;
  /** Index of the currently focused anchor (roving focus tab-stop). */
  activeIndex: Ref<number>;
  /** Evaluate the curve: input `x` → output `y`. */
  sample: (x: number) => number;
  /** Sample the curve into a `size`-length lookup table across `domainX`. */
  toLUT: (size?: number) => number[];
  /** Index of an anchor by id (`-1` when absent). */
  indexOf: (id: string) => number;
  /** Register an anchor element so roving focus can move between them. */
  registerAnchorEl: (id: string, el: HTMLElement | null) => void;
  /** Whether `id` is the first or last anchor (endpoint). */
  isEndpoint: (id: string) => boolean;
  /** Move the active anchor to `index` and focus its element. */
  setActiveIndex: (index: number) => void;
  /** Move roving focus by `delta` anchors (wraps). */
  moveFocus: (delta: number) => void;
  /**
   * Emit `anchorsCommit` with a snapshot of the current anchors. Called by parts
   * once a gesture/keypress settles (not per drag frame).
   */
  commit: () => void;
  /**
   * Update an anchor's `x`/`y` (neighbour + domain clamped, endpoints x-locked).
   * Returns whether the anchor actually moved (so discrete callers can decide
   * whether to `commit()`); does not itself emit `anchorsCommit`.
   */
  updateAnchor: (id: string, next: { x?: number; y?: number }) => boolean;
  /** Update an anchor's bezier tangent handle (`'bezier'` mode). */
  updateHandle: (id: string, side: CurveEditorHandleSide, handle: Point) => void;
  /** Insert an anchor at `x` (y defaults to the sampled curve value). */
  addAnchor: (x: number, y?: number) => string | undefined;
  /** Remove an anchor by id (endpoints are never removed). */
  removeAnchor: (id: string) => void;
}

const ctx = useContextFactory<CurveEditorContext>('CurveEditorContext');

export const provideCurveEditorContext = ctx.provide;
export const useCurveEditorContext = ctx.inject;
