// Re-export the package-canonical 2D point (from internal `utils/geometry`,
// which is not in the root barrel) so `spline` and `pointer-drag` share one
// identical `Point` symbol and the root barrel stays free of a TS2308 clash.
// Imported locally as well so the interfaces below can reference it.
import type { Point } from '../utils/geometry';

/** A 2D point in client (screen) pixels unless stated otherwise. */
export type { Point };

/**
 * The axis a drag is allowed to move along.
 * - `'x'` / `'y'`: constrain to that single axis.
 * - `'both'`: free movement (the default).
 */
export type DragAxis = 'x' | 'y' | 'both';

/**
 * The axis actually in effect for a given frame, after axis-lock resolution.
 * `'none'` means free 2D movement (no constraint), as opposed to a hard `'x'`
 * or `'y'` lock.
 */
export type EffectiveAxis = 'x' | 'y' | 'none';

/** Optional per-axis min/max clamp applied to the cumulative drag total. */
export interface DragBounds {
  /** Lower bound for the x total. */
  minX?: number;
  /** Upper bound for the x total. */
  maxX?: number;
  /** Lower bound for the y total. */
  minY?: number;
  /** Upper bound for the y total. */
  maxY?: number;
}

/** Snapshot of the keyboard modifier flags read off a pointer event. */
export interface DragModifiers {
  /** `event.shiftKey` at the moment the frame was produced. */
  shift: boolean;
  /** `event.altKey` at the moment the frame was produced. */
  alt: boolean;
  /** `event.ctrlKey` at the moment the frame was produced. */
  ctrl: boolean;
  /** `event.metaKey` at the moment the frame was produced. */
  meta: boolean;
}

/** The full, reactive state of an in-flight (or just-ended) drag gesture. */
export interface DragState {
  /** Client point where the gesture started (pointerdown). */
  startPoint: Point;
  /** Current client point of the pointer. */
  point: Point;
  /**
   * Pointer position relative to the tracked element's top-left, in client
   * pixels. `{ x: 0, y: 0 }` when no rect is tracked.
   */
  elementPoint: Point;
  /** Movement since the previous committed frame. */
  delta: Point;
  /**
   * Cumulative movement since `startPoint`, after axis lock, snap, and bounds.
   * Always recomputed from `startPoint` each frame (never accumulated).
   */
  total: Point;
  /** The axis constraint in effect for the current frame. */
  axis: EffectiveAxis;
  /** Modifier flags read live off the latest pointer event. */
  modifiers: DragModifiers;
  /** The captured `pointerId` for this gesture. */
  pointerId: number;
  /** The captured `pointerType` (`'mouse'` | `'touch'` | `'pen'`). */
  pointerType: string;
}
