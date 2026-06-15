import type { Point } from '../../internal/utils/geometry';
import type { CurveEditorAnchor, CurveEditorInterpolation } from './context';
import { catmullRom, evalCubicBezier, linearInterpolate, monotoneCubic } from '../../internal/spline';

/**
 * Sort anchors ascending by `x`, returning a new array (never mutating the
 * input). Stable for equal `x` (preserves insertion order), so monotonic-x
 * neighbour-clamping keeps a deterministic order.
 */
export function sortAnchors(anchors: readonly CurveEditorAnchor[]): CurveEditorAnchor[] {
  return anchors
    .map((a, i) => [a, i] as const)
    .sort((p, q) => (p[0].x - q[0].x) || (p[1] - q[1]))
    .map(p => p[0]);
}

/**
 * Project anchors onto bare `Point`s (`{ x, y }`), dropping bezier handles. The
 * shape the spline samplers consume.
 */
export function anchorsToPoints(anchors: readonly CurveEditorAnchor[]): Point[] {
  const out: Point[] = Array.from({ length: anchors.length });
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i]!;
    out[i] = { x: a.x, y: a.y };
  }
  return out;
}

/**
 * Build a `y = f(x)` evaluator from `anchors` for the given `interpolation`
 * mode. Anchors are assumed sorted ascending by `x`. Out-of-range `x` clamps to
 * the endpoint y (every mode is range-clamped, matching the spline helpers).
 *
 * - `'linear'` → {@link linearInterpolate}.
 * - `'monotone'` → {@link monotoneCubic} (Fritsch-Carlson, no overshoot — the
 *   tone/gamma default).
 * - `'catmull-rom'` → {@link catmullRom} sampled by `x` (resampled to a dense
 *   monotone-x table so it stays a function of `x`).
 * - `'bezier'` → per-segment cubic from each anchor's `outHandle`/`inHandle`
 *   tangents, solved for `x` via a Newton-Raphson search so the curve remains
 *   single-valued in `x`.
 *
 * The returned closure is allocation-free per call (it closes over precomputed
 * arrays), so it is cheap on the render / LUT hot path.
 */
export function buildEvaluator(
  anchors: readonly CurveEditorAnchor[],
  interpolation: CurveEditorInterpolation,
): (x: number) => number {
  const n = anchors.length;
  if (n === 0)
    return () => 0;
  if (n === 1) {
    const y = anchors[0]!.y;
    return () => y;
  }

  const points = anchorsToPoints(anchors);

  switch (interpolation) {
    case 'linear':
      return (x: number) => linearInterpolate(points, x);

    case 'monotone':
      return monotoneCubic(points);

    case 'catmull-rom':
      return buildCatmullRomEvaluator(points);

    case 'bezier':
      return buildBezierEvaluator(anchors);

    default:
      return monotoneCubic(points);
  }
}

/** Default density for resampling a parametric spline into a monotone-x table. */
const RESAMPLE = 256;

/**
 * Catmull-Rom is parametric (`t → Point`), so it can fold back on itself in `x`.
 * For a single-valued `y = f(x)` curve we sample it densely in `t`, then build a
 * piecewise-linear lookup by `x`. The result passes through every anchor (the
 * spline interpolates its control points) and is monotone-clamped at the ends.
 */
function buildCatmullRomEvaluator(points: Point[]): (x: number) => number {
  const samples: Point[] = Array.from({ length: RESAMPLE + 1 });
  for (let i = 0; i <= RESAMPLE; i++)
    samples[i] = catmullRom(points, i / RESAMPLE);
  // The sampled x's are not guaranteed strictly increasing, but for a curve that
  // is monotone in x (the editor enforces this) they are non-decreasing, so a
  // linear lookup by x is well-defined.
  return (x: number) => linearInterpolate(samples, x);
}

/**
 * Build the per-segment cubic-bezier evaluator. Between anchors `a` and `b` the
 * control points are `a + a.outHandle` and `b + b.inHandle` (handles are deltas
 * relative to their anchor); absent handles default to one-third of the segment
 * (a straight-through tangent), giving a linear segment. Each segment is solved
 * for `t` from `x` with Newton-Raphson + bisection so the curve stays a function
 * of `x`.
 */
function buildBezierEvaluator(anchors: readonly CurveEditorAnchor[]): (x: number) => number {
  const n = anchors.length;
  const xs: number[] = Array.from({ length: n });
  for (let i = 0; i < n; i++)
    xs[i] = anchors[i]!.x;

  return (x: number): number => {
    const first = anchors[0]!;
    const last = anchors[n - 1]!;
    if (x <= first.x)
      return first.y;
    if (x >= last.x)
      return last.y;

    // Binary search for the segment [lo, lo+1] containing x.
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid]! <= x)
        lo = mid;
      else
        hi = mid;
    }

    const a = anchors[lo]!;
    const b = anchors[lo + 1]!;
    const dx = b.x - a.x;
    if (dx === 0)
      return a.y;

    // Default tangents (one-third along the segment) when a handle is missing.
    const c1: Point = a.outHandle
      ? { x: a.x + a.outHandle.x, y: a.y + a.outHandle.y }
      : { x: a.x + dx / 3, y: a.y + (b.y - a.y) / 3 };
    const c2: Point = b.inHandle
      ? { x: b.x + b.inHandle.x, y: b.y + b.inHandle.y }
      : { x: b.x - dx / 3, y: b.y - (b.y - a.y) / 3 };

    const t = solveSegmentT(a.x, c1.x, c2.x, b.x, x);
    return evalCubicBezier(a, c1, c2, b, t).y;
  };
}

/**
 * Solve `x(t) = target` on a cubic whose x-components are `x0..x3` (general
 * endpoints, unlike `solveBezierX` which assumes 0/1). Newton-Raphson from a
 * normalized initial guess, with a bisection fallback.
 */
function solveSegmentT(x0: number, x1: number, x2: number, x3: number, target: number, epsilon = 1e-6): number {
  const sampleX = (t: number): number => {
    const u = 1 - t;
    return u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
  };
  const sampleDX = (t: number): number => {
    const u = 1 - t;
    return 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2);
  };

  const span = x3 - x0;
  let t = span === 0 ? 0 : (target - x0) / span;
  t = Math.min(Math.max(t, 0), 1);

  for (let i = 0; i < 8; i++) {
    const fx = sampleX(t) - target;
    if (Math.abs(fx) < epsilon)
      return t;
    const dx = sampleDX(t);
    if (Math.abs(dx) < epsilon)
      break;
    t -= fx / dx;
    t = Math.min(Math.max(t, 0), 1);
  }

  let lo = 0;
  let hi = 1;
  t = Math.min(Math.max(span === 0 ? 0 : (target - x0) / span, 0), 1);
  for (let i = 0; i < 32 && hi - lo > epsilon; i++) {
    const fx = sampleX(t);
    if (Math.abs(fx - target) < epsilon)
      return t;
    if (target > fx)
      lo = t;
    else
      hi = t;
    t = (lo + hi) / 2;
  }
  return t;
}

/**
 * Clamp a candidate `x` for the anchor at `index` so it stays strictly between
 * its neighbours (when `monotonicX`) by at least `minGap`, and within
 * `[domainMin, domainMax]`. Endpoints are pinned to the domain edge when
 * `fixedEndpoints`.
 */
export function clampAnchorX(
  anchors: readonly CurveEditorAnchor[],
  index: number,
  x: number,
  options: {
    domainMin: number;
    domainMax: number;
    monotonicX: boolean;
    fixedEndpoints: boolean;
    minGap: number;
  },
): number {
  const { domainMin, domainMax, monotonicX, fixedEndpoints, minGap } = options;
  const lo = Math.min(domainMin, domainMax);
  const hi = Math.max(domainMin, domainMax);
  const isFirst = index === 0;
  const isLast = index === anchors.length - 1;

  if (fixedEndpoints && isFirst)
    return lo;
  if (fixedEndpoints && isLast)
    return hi;

  let v = Math.min(Math.max(x, lo), hi);
  if (monotonicX) {
    const prev = anchors[index - 1];
    const next = anchors[index + 1];
    if (prev !== undefined)
      v = Math.max(v, prev.x + minGap);
    if (next !== undefined)
      v = Math.min(v, next.x - minGap);
  }
  return v;
}

/** Clamp a candidate `y` into `[domainMin, domainMax]` (order-agnostic). */
export function clampAnchorY(y: number, domainMin: number, domainMax: number): number {
  const lo = Math.min(domainMin, domainMax);
  const hi = Math.max(domainMin, domainMax);
  return Math.min(Math.max(y, lo), hi);
}

/**
 * Format the default `aria-valuetext` for an anchor: a 2-coordinate control
 * whose single `aria-valuenow` can't carry both axes, so both the input (x) and
 * output (y) are announced.
 */
export function formatAnchorValueText(x: number, y: number, decimals = 2): string {
  return `input ${round(x, decimals)}, output ${round(y, decimals)}`;
}

/** Round to `decimals` places, trimming float noise (no trailing-zero padding). */
export function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
