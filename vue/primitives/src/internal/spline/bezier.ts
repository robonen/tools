import type { Point } from './types';

/**
 * Evaluate a cubic bezier (control points `p0..p3`) at parameter `t ∈ [0,1]`
 * using the Bernstein basis. Returns the point on the curve.
 */
export function evalCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  const b0 = uu * u;
  const b1 = 3 * uu * t;
  const b2 = 3 * u * tt;
  const b3 = tt * t;
  return {
    x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
    y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
  };
}

/**
 * Evaluate a single scalar component of a cubic bezier with control values
 * `a,b,c,d` at parameter `t ∈ [0,1]` (Bernstein basis). Used by the easing solver.
 */
export function cubicBezier1D(a: number, b: number, c: number, d: number, t: number): number {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return uu * u * a + 3 * uu * t * b + 3 * u * tt * c + tt * d * t;
}

/**
 * Evaluate a CSS `cubic-bezier(x1,y1,x2,y2)` easing curve: given progress
 * `x ∈ [0,1]` return the eased `y`. The implicit control points are
 * `(0,0),(x1,y1),(x2,y2),(1,1)`. Solves `x→t` with Newton-Raphson (a few
 * iterations) and a binary-search fallback, matching the browser implementation.
 */
export function solveBezierX(x1: number, y1: number, x2: number, y2: number, x: number, epsilon = 1e-6): number {
  const cx = Math.min(Math.max(x, 0), 1);

  // Identity easing: y === x.
  if (x1 === y1 && x2 === y2)
    return cx;

  const sampleX = (t: number): number => cubicBezier1D(0, x1, x2, 1, t);
  const sampleY = (t: number): number => cubicBezier1D(0, y1, y2, 1, t);
  // dx/dt of the x-component cubic with endpoints 0 and 1.
  const sampleDX = (t: number): number => {
    const u = 1 - t;
    return 3 * u * u * x1 + 6 * u * t * (x2 - x1) + 3 * t * t * (1 - x2);
  };

  // Newton-Raphson from x as the initial guess.
  let t = cx;
  for (let i = 0; i < 8; i++) {
    const fx = sampleX(t) - cx;
    if (Math.abs(fx) < epsilon)
      return sampleY(t);
    const dx = sampleDX(t);
    if (Math.abs(dx) < epsilon)
      break;
    t -= fx / dx;
  }

  // Binary-search fallback when the derivative is too small or Newton diverges.
  let lo = 0;
  let hi = 1;
  t = cx;
  while (lo < hi) {
    const fx = sampleX(t);
    if (Math.abs(fx - cx) < epsilon)
      return sampleY(t);
    if (cx > fx)
      lo = t;
    else
      hi = t;
    t = (lo + hi) / 2;
  }
  return sampleY(t);
}

/**
 * First derivative (tangent vector) of a cubic bezier at `t ∈ [0,1]`. Useful for
 * rendering handles/normals along the curve.
 */
export function cubicBezierTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = 3 * u * u;
  const b = 6 * u * t;
  const c = 3 * t * t;
  return {
    x: a * (p1.x - p0.x) + b * (p2.x - p1.x) + c * (p3.x - p2.x),
    y: a * (p1.y - p0.y) + b * (p2.y - p1.y) + c * (p3.y - p2.y),
  };
}
