import type { Point } from '../utils/geometry';

// Re-export the package-canonical 2D point so consumers can name it from this
// module without reaching into `utils/geometry`, while avoiding a second
// `Point` declaration that would clash in the root barrel.
export type { Point };

/**
 * Categories of snap target an editor surface can expose. The kind drives both
 * styling (a playhead guide looks different from a grid line) and tie-breaking
 * via {@link SnapPriority}.
 */
export type SnapKind = 'grid' | 'edge' | 'center' | 'playhead' | 'marker' | 'guide' | 'stop' | 'neighbor';

/**
 * A single candidate the engine can snap to. Targets live in PIXEL space (`px`)
 * for distance math but carry their domain `value` so a match maps straight back
 * without re-inverting the projection.
 */
export interface SnapTarget {
  /** Axis this target constrains. */
  axis: 'x' | 'y';
  /** Pre-projected pixel position (what distances are measured against). */
  px: number;
  /** Domain-space value returned verbatim on a match. */
  value: number;
  /** Category used for styling and priority tie-breaking. */
  kind: SnapKind;
  /** Optional stable identity (e.g. a clip id) for exclusion/locking. */
  id?: string;
  /** Optional per-target pull weight; reserved for consumer weighting. */
  strength?: number;
}

/**
 * Outcome of a one-dimensional snap. `value` is always usable: it is either the
 * snapped target value or the untouched candidate when nothing matched.
 */
export interface SnapResult1D {
  /** Resolved domain value (snapped or pass-through). */
  value: number;
  /** Whether a target was within range and applied. */
  snapped: boolean;
  /** The matched target, or `null` when none. */
  target: SnapTarget | null;
  /** Signed pixel correction applied (`target.px - candidatePx`); `0` when not snapped. */
  deltaPx: number;
}

/**
 * Outcome of a two-dimensional snap. Each axis resolves independently, so a
 * point can snap on `x` only, `y` only, both, or neither.
 */
export interface SnapResult2D {
  /** Resolved point (per-axis snapped or pass-through). */
  point: Point;
  /** Whether the `x` axis snapped. */
  snappedX: boolean;
  /** Whether the `y` axis snapped. */
  snappedY: boolean;
  /** The matched `x` target, or `null`. */
  targetX: SnapTarget | null;
  /** The matched `y` target, or `null`. */
  targetY: SnapTarget | null;
}

/**
 * Tie-breaking policy. Within a `relaxPx` band of the nearest candidate, a kind
 * appearing earlier in `order` wins even if it is a few pixels farther — so a
 * playhead can "out-pull" a grid line the eye treats as less important.
 */
export interface SnapPriority {
  /**
   * Kinds from highest to lowest priority. Kinds absent from the list rank
   * after all listed kinds, in target order.
   * @default undefined (pure nearest-distance)
   */
  order?: SnapKind[];
  /**
   * Pixel slack within which a higher-priority kind may beat a nearer one.
   * @default 0
   */
  relaxPx?: number;
}
