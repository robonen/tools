import { clamp } from '@robonen/stdlib';
import type { DragAxis, DragBounds, DragModifiers, EffectiveAxis, Point } from './types';

/**
 * Resolve which axis a frame is constrained to.
 *
 * A statically configured axis (`'x'` / `'y'`) always wins. With `'both'` and
 * `lockOnShift` enabled, holding shift locks to the *dominant* axis of the raw
 * total so far (the larger absolute component); ties resolve to `'x'`. Otherwise
 * the frame is unconstrained (`'none'`).
 *
 * @param staticAxis The configured axis from options.
 * @param lockOnShift Whether shift engages dominant-axis locking.
 * @param modifiers Live modifier flags from the current pointer event.
 * @param rawTotal The unconstrained `last - start` total, used to pick the dominant axis.
 */
export function resolveAxisLock(
  staticAxis: DragAxis,
  lockOnShift: boolean,
  modifiers: DragModifiers,
  rawTotal: Point,
): EffectiveAxis {
  if (staticAxis !== 'both') return staticAxis;
  if (lockOnShift && modifiers.shift)
    return Math.abs(rawTotal.x) >= Math.abs(rawTotal.y) ? 'x' : 'y';
  return 'none';
}

/** Round a value to the nearest multiple of `grid` (a `0`/falsy grid is a no-op). */
function snapAxis(value: number, grid: number): number {
  return grid ? Math.round(value / grid) * grid : value;
}

/** Inputs for a single drag frame computation. */
interface ComputeFrameParams {
  /** Client point where the gesture began. */
  start: Point;
  /** Latest client point of the pointer. */
  last: Point;
  /** Tracked element rect, or `undefined` when rect tracking is off. */
  rect: DOMRect | undefined;
  /** Resolved axis constraint for this frame. */
  axis: EffectiveAxis;
  /** Snap grid: a scalar (both axes) or `[gx, gy]` tuple; `undefined` disables snapping. */
  snapGrid: number | [number, number] | undefined;
  /** Optional per-axis clamp on the cumulative total. */
  bounds: DragBounds | undefined;
  /** The previously committed total, used to derive this frame's `delta`. */
  prevTotal: Point;
}

/**
 * Compute one drag frame as a pure function of its inputs — no DOM access, no
 * reactivity, fully unit-testable.
 *
 * Order of operations is load-bearing:
 * 1. `rawTotal = last - start`.
 * 2. Apply the axis lock by zeroing the constrained-out component.
 * 3. Snap the *total* (not the delta) to `snapGrid` when set.
 * 4. Clamp the total to `bounds` per axis.
 *
 * `delta = clampedTotal - prevTotal`. The total is always recomputed from
 * `start` every frame (frame deltas are never accumulated) so a mid-gesture
 * axis-lock flip can never double-count.
 */
export function computeFrame(params: ComputeFrameParams): { total: Point; delta: Point; elementPoint: Point } {
  const { start, last, rect, axis, snapGrid, bounds, prevTotal } = params;

  // 1. Raw cumulative movement from the gesture origin.
  let tx = last.x - start.x;
  let ty = last.y - start.y;

  // 2. Axis lock: zero the locked-out component.
  if (axis === 'x') ty = 0;
  else if (axis === 'y') tx = 0;

  // 3. Snap the TOTAL to the grid (scalar grid applies to both axes).
  if (snapGrid !== undefined) {
    const gx = typeof snapGrid === 'number' ? snapGrid : snapGrid[0];
    const gy = typeof snapGrid === 'number' ? snapGrid : snapGrid[1];
    tx = snapAxis(tx, gx);
    ty = snapAxis(ty, gy);
  }

  // 4. Clamp the (snapped) total to bounds, per axis. Done after snap so a
  //    snapped value can never land outside the bounds.
  if (bounds) {
    tx = clamp(tx, bounds.minX ?? -Infinity, bounds.maxX ?? Infinity);
    ty = clamp(ty, bounds.minY ?? -Infinity, bounds.maxY ?? Infinity);
  }

  const total: Point = { x: tx, y: ty };
  const delta: Point = { x: tx - prevTotal.x, y: ty - prevTotal.y };
  const elementPoint: Point = rect
    ? { x: last.x - rect.left, y: last.y - rect.top }
    : { x: 0, y: 0 };

  return { total, delta, elementPoint };
}
