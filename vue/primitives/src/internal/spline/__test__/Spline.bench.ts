import { bench, describe } from 'vitest';
import {
  buildBezierPath,
  buildPolylinePath,
  buildSmoothPath,
  catmullRom,
  cubicBezier1D,
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

// ---------------------------------------------------------------------------
// Deterministic fixtures (NO Math.random). Values are seeded by index/formula.
// These mirror realistic usage: knot lists for tone/gamma/levels curves, the
// 4 control points of a CSS easing bezier, and pointer coordinates for a drag.
// ---------------------------------------------------------------------------

/** Build `n` knots strictly ascending in x (required by the interpolants). */
function makeKnots(n: number): Point[] {
  const out: Point[] = Array.from({ length: n });
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1); // 0..1, strictly increasing
    // A wobbly-but-monotone-ish y so monotoneCubic does real tangent work.
    const y = 0.5 + 0.45 * Math.sin(i * 0.7) * (1 - i / (n * 4));
    out[i] = { x, y };
  }
  return out;
}

/** Build `n` 2D points for Catmull-Rom / smooth-path (x need not be sorted). */
function makePath(n: number): Point[] {
  const out: Point[] = Array.from({ length: n });
  for (let i = 0; i < n; i++) {
    const a = i * 0.37;
    out[i] = { x: i * 4, y: 120 + 80 * Math.sin(a) + 30 * Math.cos(a * 2.1) };
  }
  return out;
}

/** Evenly spaced sample parameters in [0,1] for repeated evaluation. */
function makeParams(n: number): number[] {
  const out: number[] = Array.from({ length: n });
  for (let i = 0; i < n; i++)
    out[i] = i / (n - 1);
  return out;
}

const knots100 = makeKnots(100);
const knots1000 = makeKnots(1000);

const path50 = makePath(50);
const path500 = makePath(500);

const params100 = makeParams(100);
const params1000 = makeParams(1000);

// CSS "ease" control points — the canonical solveBezierX workload.
const EASE = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 } as const;

// A single cubic bezier segment (e.g. one connector / handle).
const B0: Point = { x: 0, y: 0 };
const B1: Point = { x: 0.25, y: 1 };
const B2: Point = { x: 0.75, y: 0 };
const B3: Point = { x: 1, y: 1 };

// Pre-built smooth-path control points used by the simulated pointer-move bench.
const dragPath = makePath(64);

// ---------------------------------------------------------------------------
// evalCubicBezier — point on a cubic bezier, evaluated over many parameters.
// ---------------------------------------------------------------------------

describe('evalCubicBezier — sweep t', () => {
  bench('100 params', () => {
    for (let i = 0; i < params100.length; i++)
      evalCubicBezier(B0, B1, B2, B3, params100[i]!);
  });

  bench('1000 params', () => {
    for (let i = 0; i < params1000.length; i++)
      evalCubicBezier(B0, B1, B2, B3, params1000[i]!);
  });
});

// ---------------------------------------------------------------------------
// cubicBezierTangent — derivative/handle direction, evaluated over many t.
// ---------------------------------------------------------------------------

describe('cubicBezierTangent — sweep t', () => {
  bench('100 params', () => {
    for (let i = 0; i < params100.length; i++)
      cubicBezierTangent(B0, B1, B2, B3, params100[i]!);
  });

  bench('1000 params', () => {
    for (let i = 0; i < params1000.length; i++)
      cubicBezierTangent(B0, B1, B2, B3, params1000[i]!);
  });
});

// ---------------------------------------------------------------------------
// solveBezierX — Newton-Raphson easing solver (x → eased y). The hot path for
// every animation frame that maps progress through a CSS cubic-bezier easing.
// `cubicBezier1D` benched alongside as the scalar primitive it builds on.
// ---------------------------------------------------------------------------

describe('solveBezierX — ease (x→y)', () => {
  bench('100 params', () => {
    for (let i = 0; i < params100.length; i++)
      solveBezierX(EASE.x1, EASE.y1, EASE.x2, EASE.y2, params100[i]!);
  });

  bench('1000 params', () => {
    for (let i = 0; i < params1000.length; i++)
      solveBezierX(EASE.x1, EASE.y1, EASE.x2, EASE.y2, params1000[i]!);
  });

  // Identity easing (x1===y1 && x2===y2) short-circuits — establishes the floor.
  bench('1000 params — identity short-circuit', () => {
    for (let i = 0; i < params1000.length; i++)
      solveBezierX(0, 0, 1, 1, params1000[i]!);
  });
});

describe('cubicBezier1D — scalar Bernstein', () => {
  bench('1000 params', () => {
    for (let i = 0; i < params1000.length; i++)
      cubicBezier1D(0, EASE.x1, EASE.x2, 1, params1000[i]!);
  });
});

// ---------------------------------------------------------------------------
// catmullRom — spline through N knots, evaluated over many t. Two axes vary:
// knot count (segment locating cost) and sample count (per-frame evaluation).
// ---------------------------------------------------------------------------

describe('catmullRom — sweep t', () => {
  bench('50 knots × 100 params', () => {
    for (let i = 0; i < params100.length; i++)
      catmullRom(path50, params100[i]!);
  });

  bench('500 knots × 100 params', () => {
    for (let i = 0; i < params100.length; i++)
      catmullRom(path500, params100[i]!);
  });

  bench('500 knots × 1000 params', () => {
    for (let i = 0; i < params1000.length; i++)
      catmullRom(path500, params1000[i]!);
  });

  bench('500 knots × 1000 params — closed', () => {
    for (let i = 0; i < params1000.length; i++)
      catmullRom(path500, params1000[i]!, { closed: true });
  });
});

// ---------------------------------------------------------------------------
// monotoneCubic — Fritsch-Carlson build (one-time, O(n)) then repeated lookup
// (binary-search per call). This is the real tone/gamma-curve workload: build
// the interpolant once when knots change, then apply it across a LUT every
// frame. Split into "build" and "build + apply 256-LUT" benches.
// ---------------------------------------------------------------------------

describe('monotoneCubic — build', () => {
  bench('100 knots', () => {
    monotoneCubic(knots100);
  });

  bench('1000 knots', () => {
    monotoneCubic(knots1000);
  });
});

describe('monotoneCubic — apply (pre-built fn)', () => {
  const f100 = monotoneCubic(knots100);
  const f1000 = monotoneCubic(knots1000);

  bench('100 knots → 256-LUT', () => {
    toLUT(f100, 256);
  });

  bench('1000 knots → 256-LUT', () => {
    toLUT(f1000, 256);
  });

  // 8-bit channel LUT — the full per-channel color-correction pass.
  bench('1000 knots → 1024-LUT', () => {
    toLUT(f1000, 1024);
  });
});

describe('monotoneCubic — build + apply (knots changed)', () => {
  bench('100 knots → build + 256-LUT', () => {
    toLUT(monotoneCubic(knots100), 256);
  });

  bench('1000 knots → build + 256-LUT', () => {
    toLUT(monotoneCubic(knots1000), 256);
  });
});

// ---------------------------------------------------------------------------
// linearInterpolate — binary-search piecewise-linear lookup over many queries.
// ---------------------------------------------------------------------------

describe('linearInterpolate — query sweep', () => {
  bench('100 knots × 1000 queries', () => {
    for (let i = 0; i < params1000.length; i++)
      linearInterpolate(knots100, params1000[i]!);
  });

  bench('1000 knots × 1000 queries', () => {
    for (let i = 0; i < params1000.length; i++)
      linearInterpolate(knots1000, params1000[i]!);
  });
});

// ---------------------------------------------------------------------------
// Polyline sampling — turn a parametric/scalar curve into render-ready points.
// ---------------------------------------------------------------------------

describe('sampleToPolyline — bezier curve', () => {
  const curve = (t: number): Point => evalCubicBezier(B0, B1, B2, B3, t);

  bench('100 segments', () => {
    sampleToPolyline(curve, 100);
  });

  bench('1000 segments', () => {
    sampleToPolyline(curve, 1000);
  });
});

describe('sampleFnToPolyline — monotone curve', () => {
  const f = monotoneCubic(knots100);

  bench('100 segments', () => {
    sampleFnToPolyline(f, 0, 1, 100);
  });

  bench('1000 segments', () => {
    sampleFnToPolyline(f, 0, 1, 1000);
  });
});

// ---------------------------------------------------------------------------
// SVG path string building — runs on every reactive re-render of a curve.
// ---------------------------------------------------------------------------

describe('buildPolylinePath — string concat', () => {
  const poly100 = sampleToPolyline((t: number) => evalCubicBezier(B0, B1, B2, B3, t), 100);
  const poly1000 = sampleToPolyline((t: number) => evalCubicBezier(B0, B1, B2, B3, t), 1000);

  bench('100 points', () => {
    buildPolylinePath(poly100);
  });

  bench('1000 points', () => {
    buildPolylinePath(poly1000);
  });
});

describe('buildSmoothPath — Catmull-Rom cubics', () => {
  bench('50 points', () => {
    buildSmoothPath(path50);
  });

  bench('500 points', () => {
    buildSmoothPath(path500);
  });

  bench('500 points — tension 0.5', () => {
    buildSmoothPath(path500, 0.5);
  });
});

describe('buildBezierPath — single segment', () => {
  bench('1 segment', () => {
    buildBezierPath(B0, B1, B2, B3);
  });
});

// ---------------------------------------------------------------------------
// Simulated pointer-move: a control point is dragged each frame, the smooth
// path is rebuilt, and a LUT is re-derived from the moved knots. This is the
// end-to-end per-frame cost during an interactive curve/handle drag.
// ---------------------------------------------------------------------------

describe('pointer-move — smooth path rebuild', () => {
  bench('drag mutate + buildSmoothPath (64 points)', () => {
    // Move one control point along a deterministic path (no Math.random).
    const i = 32;
    const base = dragPath[i]!;
    dragPath[i] = { x: base.x, y: base.y + 1 };
    buildSmoothPath(dragPath);
    // Restore so the fixture stays stable across iterations.
    dragPath[i] = base;
  });
});

describe('pointer-move — curve recompute', () => {
  // Drag a tone-curve knot → rebuild monotone interpolant → re-apply 256-LUT.
  bench('mutate knot + monotoneCubic + 256-LUT (100 knots)', () => {
    const i = 50;
    const base = knots100[i]!;
    knots100[i] = { x: base.x, y: base.y + 0.01 };
    toLUT(monotoneCubic(knots100), 256);
    knots100[i] = base;
  });
});
