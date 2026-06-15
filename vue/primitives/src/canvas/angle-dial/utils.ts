import type { Point } from '../../internal/utils/geometry';
import type { AngleDialSnap } from './context';

// Reuse the package-canonical 2D point (internal `utils/geometry`, not in the
// root barrel) so angle-dial's `Point` is the SAME symbol as spline/pointer-drag/
// snapping re-export — keeps the root barrel free of a TS2308 `Point` clash.
/** A 2D point in client (screen) pixels. */
export type { Point };

/**
 * ANGLE CONVENTION (load-bearing — every consumer assumes it):
 *
 *   0° points UP (12 o'clock) and the angle increases CLOCKWISE.
 *
 *   up = 0°, right = 90°, down = 180°, left = 270°.
 *
 * This matches how rotation/heading dials are read by humans (a compass-style
 * "12 o'clock is zero, turn right to increase"), not the mathematical
 * convention (0° = +x, counter-clockwise). All conversions below honor it.
 */

const TAU = Math.PI * 2;
const RAD_TO_DEG = 360 / TAU;
const DEG_TO_RAD = TAU / 360;

/** Wrap an angle (degrees) into the `[0, 360)` range. */
export function normalizeDeg(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/**
 * Convert a screen-space point into an angle (degrees) about `center`, using
 * the documented convention (0° = up, clockwise-positive). Returns a value in
 * `[0, 360)`.
 *
 * Screen y grows downward, so a point directly below the center (`dy > 0`)
 * reads as 180° (down), and a point to the right (`dx > 0`) reads as 90°.
 */
export function pointToAngle(point: Point, center: Point): number {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  // atan2(dx, -dy): rotate the standard math frame so 0° is up and the angle
  // increases clockwise. `-dy` flips the down-positive screen axis to up.
  const rad = Math.atan2(dx, -dy);
  return normalizeDeg(rad * RAD_TO_DEG);
}

/**
 * Convert an angle (degrees) into a point on a circle of `radius` about
 * `center`, using the documented convention (0° = up, clockwise-positive).
 * The inverse of {@link pointToAngle}.
 */
export function angleToPoint(deg: number, radius: number, center: Point): Point {
  const rad = deg * DEG_TO_RAD;
  return {
    x: center.x + Math.sin(rad) * radius,
    y: center.y - Math.cos(rad) * radius,
  };
}

/**
 * Number of decimal digits in a numeric `step`, mirroring the slider's helper.
 * Used to compensate floating-point drift after step rounding.
 */
export function getStepDecimals(step: number): number {
  if (!Number.isFinite(step)) return 0;
  const str = String(step);
  const dot = str.indexOf('.');
  if (dot === -1) return 0;
  return str.length - dot - 1;
}

/** Snap `value` to the nearest multiple of `step` anchored at `min`. */
export function roundToStep(value: number, step: number, min: number, decimals: number): number {
  if (step <= 0) return value;
  const nearest = Math.round((value - min) / step) * step + min;
  return decimals > 0 ? Number(nearest.toFixed(decimals)) : nearest;
}

/**
 * Snap an angle to the nearest configured snap target.
 *
 * - scalar `snap` → nearest multiple of that increment (anchored at 0).
 * - `snap` array → nearest of the explicit angles. In `wrap` mode the distance
 *   is measured around the circle so a value near 350° can snap to a `0`
 *   target; in clamp/linear mode it is a plain numeric distance.
 *
 * Returns `value` unchanged when `snap` is `undefined` or empty.
 */
export function applySnap(value: number, snap: AngleDialSnap, wrap: boolean): number {
  if (snap === undefined) return value;
  if (typeof snap === 'number') {
    if (snap <= 0) return value;
    return Math.round(value / snap) * snap;
  }
  if (snap.length === 0) return value;
  let best = snap[0]!;
  let bestDist = wrap ? circularDistance(value, best) : Math.abs(value - best);
  for (let i = 1; i < snap.length; i++) {
    const target = snap[i]!;
    const dist = wrap ? circularDistance(value, target) : Math.abs(value - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = target;
    }
  }
  return best;
}

/** Shortest absolute angular distance (degrees) between two angles on a circle. */
export function circularDistance(a: number, b: number): number {
  const d = Math.abs(normalizeDeg(a) - normalizeDeg(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Map an angle (degrees) onto the HSL hue wheel, returning a fully-saturated
 * CSS color string for that hue. Handy when the dial doubles as a hue ring
 * (`min: 0, max: 360, wrap: 'wrap'`): feed the angle straight in to color the
 * thumb or a swatch. `saturation` and `lightness` are percentages.
 *
 * @param deg The angle in degrees (any range; wrapped to `[0, 360)`).
 * @param saturation Saturation percentage. @default 100
 * @param lightness Lightness percentage. @default 50
 */
export function angleToHue(deg: number, saturation = 100, lightness = 50): string {
  return `hsl(${normalizeDeg(deg)}, ${saturation}%, ${lightness}%)`;
}

/**
 * Signed shortest angular step (degrees) from `from` to `to` on a circle,
 * in `(-180, 180]`. Positive is clockwise (increasing angle). Used to track the
 * frame-to-frame delta in `wrap` mode so crossing the `0` / `360` seam
 * accumulates smoothly instead of jumping `359 → 0 → 359`.
 */
export function shortestDelta(from: number, to: number): number {
  let d = (normalizeDeg(to) - normalizeDeg(from)) % 360;
  if (d > 180) d -= 360;
  else if (d <= -180) d += 360;
  return d;
}
