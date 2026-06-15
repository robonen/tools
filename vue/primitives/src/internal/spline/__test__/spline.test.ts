import { describe, expect, it } from 'vitest';
import {
  buildBezierPath,
  buildPolylinePath,
  buildSmoothPath,
  catmullRom,
  cubicBezierTangent,
  evalCubicBezier,
  linearInterpolate,
  monotoneCubic,
  sampleFnToPolyline,
  sampleToPolyline,
  solveBezierX,
  toLUT,
} from '../index';
import type { Point } from '../index';

describe('evalCubicBezier', () => {
  const p0: Point = { x: 0, y: 0 };
  const p1: Point = { x: 0, y: 1 };
  const p2: Point = { x: 1, y: 1 };
  const p3: Point = { x: 1, y: 0 };

  it('returns p0 at t=0 and p3 at t=1', () => {
    expect(evalCubicBezier(p0, p1, p2, p3, 0)).toEqual(p0);
    expect(evalCubicBezier(p0, p1, p2, p3, 1)).toEqual(p3);
  });

  it('midpoint sits inside the convex hull', () => {
    const mid = evalCubicBezier(p0, p1, p2, p3, 0.5);
    expect(mid.x).toBeCloseTo(0.5, 10);
    expect(mid.y).toBeGreaterThan(0);
    expect(mid.y).toBeLessThanOrEqual(1);
  });

  it('straight diagonal stays linear', () => {
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 1, y: 1 };
    const c: Point = { x: 2, y: 2 };
    const d: Point = { x: 3, y: 3 };
    const mid = evalCubicBezier(a, b, c, d, 0.5);
    expect(mid.x).toBeCloseTo(1.5, 10);
    expect(mid.y).toBeCloseTo(1.5, 10);
  });
});

describe('cubicBezierTangent', () => {
  it('points along the curve direction at the start', () => {
    const t = cubicBezierTangent({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }, 0);
    // Initial tangent is 3*(p1-p0).
    expect(t.x).toBeCloseTo(3, 10);
    expect(t.y).toBeCloseTo(0, 10);
  });
});

describe('solveBezierX', () => {
  it('linear cubic-bezier(0,0,1,1) gives y ≈ x', () => {
    for (const x of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      expect(solveBezierX(0, 0, 1, 1, x)).toBeCloseTo(x, 6);
    }
  });

  it('ease cubic-bezier(0.42,0,0.58,1): endpoints, midpoint, monotonic', () => {
    expect(solveBezierX(0.42, 0, 0.58, 1, 0)).toBeCloseTo(0, 6);
    expect(solveBezierX(0.42, 0, 0.58, 1, 1)).toBeCloseTo(1, 6);
    expect(solveBezierX(0.42, 0, 0.58, 1, 0.5)).toBeCloseTo(0.5, 4);

    let prev = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const y = solveBezierX(0.42, 0, 0.58, 1, i / 20);
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = y;
    }
  });

  it('clamps x outside [0,1]', () => {
    expect(solveBezierX(0.42, 0, 0.58, 1, -1)).toBeCloseTo(0, 6);
    expect(solveBezierX(0.42, 0, 0.58, 1, 2)).toBeCloseTo(1, 6);
  });
});

describe('catmullRom', () => {
  const pts: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 0 },
    { x: 3, y: 1 },
  ];

  it('hits the first and last point at t=0 and t=1', () => {
    const a = catmullRom(pts, 0);
    const b = catmullRom(pts, 1);
    expect(a.x).toBeCloseTo(0, 10);
    expect(a.y).toBeCloseTo(0, 10);
    expect(b.x).toBeCloseTo(3, 10);
    expect(b.y).toBeCloseTo(1, 10);
  });

  it('passes through interior knots at segment boundaries', () => {
    // 3 segments → knot 1 at t=1/3, knot 2 at t=2/3.
    const k1 = catmullRom(pts, 1 / 3);
    expect(k1.x).toBeCloseTo(1, 6);
    expect(k1.y).toBeCloseTo(1, 6);
  });
});

describe('monotoneCubic', () => {
  it('passes exactly through input points at their x', () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
      { x: 4, y: 5 },
    ];
    const f = monotoneCubic(pts);
    for (const p of pts)
      expect(f(p.x)).toBeCloseTo(p.y, 10);
  });

  it('no overshoot on a step-like dataset', () => {
    const f = monotoneCubic([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 1 },
    ]);
    for (let i = 0; i <= 40; i++) {
      const x = (i / 40) * 2;
      const y = f(x);
      expect(y).toBeGreaterThanOrEqual(-1e-9);
      expect(y).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('clamps x to [x0, xn]', () => {
    const f = monotoneCubic([{ x: 1, y: 3 }, { x: 2, y: 7 }]);
    expect(f(-5)).toBeCloseTo(3, 10);
    expect(f(99)).toBeCloseTo(7, 10);
  });
});

describe('linearInterpolate', () => {
  const pts: Point[] = [{ x: 0, y: 0 }, { x: 2, y: 4 }, { x: 4, y: 0 }];

  it('interpolates and clamps', () => {
    expect(linearInterpolate(pts, 1)).toBeCloseTo(2, 10);
    expect(linearInterpolate(pts, 3)).toBeCloseTo(2, 10);
    expect(linearInterpolate(pts, -1)).toBeCloseTo(0, 10);
    expect(linearInterpolate(pts, 10)).toBeCloseTo(0, 10);
  });
});

describe('sampleToPolyline / sampleFnToPolyline', () => {
  it('produces segments + 1 points', () => {
    const poly = sampleToPolyline(t => ({ x: t, y: t * t }), 10);
    expect(poly).toHaveLength(11);
    expect(poly[0]).toEqual({ x: 0, y: 0 });
    expect(poly[10]).toEqual({ x: 1, y: 1 });
  });

  it('samples y=f(x) across the range', () => {
    const poly = sampleFnToPolyline(x => 2 * x, 0, 5, 5);
    expect(poly).toHaveLength(6);
    expect(poly[0]).toEqual({ x: 0, y: 0 });
    expect(poly[5]).toEqual({ x: 5, y: 10 });
  });
});

describe('path builders', () => {
  it('buildPolylinePath format', () => {
    const d = buildPolylinePath([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 3, y: 4 }]);
    expect(d).toBe('M 0,0 L 1,2 L 3,4');
  });

  it('buildPolylinePath empty', () => {
    expect(buildPolylinePath([])).toBe('');
  });

  it('buildBezierPath format', () => {
    const d = buildBezierPath({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 });
    expect(d).toBe('M 0,0 C 1,0 1,1 2,1');
  });

  it('buildSmoothPath starts with a moveto and emits cubic segments', () => {
    const d = buildSmoothPath([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 3, y: 1 }]);
    expect(d.startsWith('M 0,0')).toBe(true);
    expect(d).toContain('C ');
  });
});

describe('toLUT', () => {
  it('has the requested length with correct endpoints', () => {
    const lut = toLUT(x => x * x, 256);
    expect(lut).toHaveLength(256);
    expect(lut[0]).toBeCloseTo(0, 10);
    expect(lut[255]).toBeCloseTo(1, 10);
  });

  it('respects a custom range', () => {
    const lut = toLUT(x => x, 3, 0, 10);
    expect(lut).toEqual([0, 5, 10]);
  });
});
