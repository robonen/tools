import type { Point } from './types';

/**
 * Sample a parametric curve `t → Point` into `segments + 1` evenly spaced points
 * over `t ∈ [0,1]`.
 */
export function sampleToPolyline(curve: (t: number) => Point, segments: number): Point[] {
  const count = Math.max(1, Math.floor(segments));
  const out: Point[] = [];
  for (let i = 0; i <= count; i++)
    out.push(curve(i / count));
  return out;
}

/**
 * Sample a `y = f(x)` function across `[x0, x1]` into `segments + 1` points.
 */
export function sampleFnToPolyline(fn: (x: number) => number, x0: number, x1: number, segments: number): Point[] {
  const count = Math.max(1, Math.floor(segments));
  const out: Point[] = [];
  for (let i = 0; i <= count; i++) {
    const x = x0 + ((x1 - x0) * i) / count;
    out.push({ x, y: fn(x) });
  }
  return out;
}

/**
 * Build an SVG path `d` string for a polyline through `points` ("M …L …").
 */
export function buildPolylinePath(points: Point[]): string {
  if (points.length === 0)
    return '';
  const first = points[0]!;
  let d = `M ${first.x},${first.y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    d += ` L ${p.x},${p.y}`;
  }
  return d;
}

/**
 * Build a smooth SVG path `d` through `points` using Catmull-Rom-derived cubic
 * bezier segments. `tension` (0 = uniform Catmull-Rom) controls the bow.
 */
export function buildSmoothPath(points: Point[], tension = 0): string {
  const n = points.length;
  if (n === 0)
    return '';
  if (n === 1) {
    const p = points[0]!;
    return `M ${p.x},${p.y}`;
  }
  if (n === 2) {
    const a = points[0]!;
    const b = points[1]!;
    return `M ${a.x},${a.y} L ${b.x},${b.y}`;
  }

  const alpha = (1 - tension) / 6;
  const at = (i: number): Point => points[Math.min(Math.max(i, 0), n - 1)]!;

  const start = points[0]!;
  let d = `M ${start.x},${start.y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    // Catmull-Rom → cubic bezier control points.
    const c1x = p1.x + alpha * (p2.x - p0.x);
    const c1y = p1.y + alpha * (p2.y - p0.y);
    const c2x = p2.x - alpha * (p3.x - p1.x);
    const c2y = p2.y - alpha * (p3.y - p1.y);
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}
