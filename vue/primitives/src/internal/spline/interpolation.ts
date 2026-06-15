import type { Point } from './types';

/**
 * Evaluate a Catmull-Rom spline passing through `points` at `t ∈ [0,1]` spanning
 * the whole spline. `tension` (0 = uniform Catmull-Rom) and `closed` (loop the
 * curve) are optional. Each segment is evaluated via its equivalent cubic.
 */
export function catmullRom(points: Point[], t: number, options?: { tension?: number; closed?: boolean }): Point {
  const n = points.length;
  if (n === 0)
    return { x: 0, y: 0 };
  if (n === 1)
    return { x: points[0]!.x, y: points[0]!.y };

  const tension = options?.tension ?? 0;
  const closed = options?.closed ?? false;
  // Catmull-Rom "tension" scales the tangents: alpha = (1 - tension) / 6.
  const alpha = (1 - tension) / 6;

  const segments = closed ? n : n - 1;
  const u = Math.min(Math.max(t, 0), 1) * segments;
  let seg = Math.floor(u);
  if (seg >= segments)
    seg = segments - 1;
  const local = u - seg;

  const at = (i: number): Point => {
    if (closed)
      return points[((i % n) + n) % n]!;
    const c = Math.min(Math.max(i, 0), n - 1);
    return points[c]!;
  };

  const p0 = at(seg - 1);
  const p1 = at(seg);
  const p2 = at(seg + 1);
  const p3 = at(seg + 2);

  // Convert Catmull-Rom to a cubic and evaluate at `local`.
  const tt = local * local;
  const ttt = tt * local;

  const eval1 = (a0: number, a1: number, a2: number, a3: number): number => {
    const m1 = alpha * 3 * (a2 - a0);
    const m2 = alpha * 3 * (a3 - a1);
    return (
      (2 * ttt - 3 * tt + 1) * a1
      + (ttt - 2 * tt + local) * m1
      + (-2 * ttt + 3 * tt) * a2
      + (ttt - tt) * m2
    );
  };

  return {
    x: eval1(p0.x, p1.x, p2.x, p3.x),
    y: eval1(p0.y, p1.y, p2.y, p3.y),
  };
}

/**
 * Build a Fritsch-Carlson monotone cubic interpolant through `points` (sorted
 * ascending by `x`). Returns `y = f(x)` that preserves monotonicity (no
 * overshoot); `x` is clamped to `[x0, xn]`. Load-bearing for tone/gamma curves.
 */
export function monotoneCubic(points: Point[]): (x: number) => number {
  const n = points.length;

  if (n === 0)
    return () => 0;
  if (n === 1) {
    const y = points[0]!.y;
    return () => y;
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  // Secant slopes between consecutive points.
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = xs[i + 1]! - xs[i]!;
    dx.push(h);
    slope.push(h === 0 ? 0 : (ys[i + 1]! - ys[i]!) / h);
  }

  // Tangents `m` at each knot (Fritsch-Carlson). Built in ascending index order
  // so the array stays packed (PACKED_DOUBLE_ELEMENTS).
  const m: number[] = [];
  m.push(slope[0]!);
  for (let i = 1; i < n - 1; i++) {
    const s0 = slope[i - 1]!;
    const s1 = slope[i]!;
    // A local extremum (sign change or flat) forces a zero tangent.
    if (s0 * s1 <= 0)
      m.push(0);
    else
      m.push((s0 + s1) / 2);
  }
  m.push(slope[n - 2]!);

  // Adjust tangents to enforce monotonicity (no overshoot) on each segment.
  for (let i = 0; i < n - 1; i++) {
    const s = slope[i]!;
    if (s === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / s;
    const b = m[i + 1]! / s;
    const h = a * a + b * b;
    if (h > 9) {
      const tau = 3 / Math.sqrt(h);
      m[i] = tau * a * s;
      m[i + 1] = tau * b * s;
    }
  }

  return (x: number): number => {
    const x0 = xs[0]!;
    const xn = xs[n - 1]!;
    const cx = Math.min(Math.max(x, x0), xn);

    // Binary search for the segment containing `cx`.
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid]! <= cx)
        lo = mid;
      else
        hi = mid;
    }

    const h = dx[lo]!;
    if (h === 0)
      return ys[lo]!;
    const t = (cx - xs[lo]!) / h;
    const t2 = t * t;
    const t3 = t2 * t;

    // Hermite basis functions.
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    return h00 * ys[lo]! + h10 * h * m[lo]! + h01 * ys[lo + 1]! + h11 * h * m[lo + 1]!;
  };
}

/**
 * Piecewise-linear interpolation of `y` at `x` through `points` (sorted
 * ascending by `x`). `x` is clamped to the points' x-range.
 */
export function linearInterpolate(points: Point[], x: number): number {
  const n = points.length;
  if (n === 0)
    return 0;
  if (n === 1)
    return points[0]!.y;

  const first = points[0]!;
  const last = points[n - 1]!;
  if (x <= first.x)
    return first.y;
  if (x >= last.x)
    return last.y;

  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid]!.x <= x)
      lo = mid;
    else
      hi = mid;
  }

  const a = points[lo]!;
  const b = points[lo + 1]!;
  const span = b.x - a.x;
  if (span === 0)
    return a.y;
  const t = (x - a.x) / span;
  return a.y + t * (b.y - a.y);
}
