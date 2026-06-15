import type { VueWrapper } from '@vue/test-utils';
import type { CurveEditorAnchor, CurveEditorInterpolation } from '../index';
import { mount } from '@vue/test-utils';
import { bench, describe } from 'vitest';
import { defineComponent, h } from 'vue';
import { CurveEditorCurve, CurveEditorPoint, CurveEditorRoot } from '../index';
import {
  anchorsToPoints,
  buildEvaluator,
  clampAnchorX,
  clampAnchorY,
  sortAnchors,
} from '../utils';
import {
  buildBezierPath,
  buildPolylinePath,
  catmullRom,
  evalCubicBezier,
  linearInterpolate,
  monotoneCubic,
  sampleFnToPolyline,
  toLUT,
} from '../../../internal/spline';

// ─── deterministic fixtures (NO Math.random — values seeded by index) ────────
//
// A monotone-in-x anchor set across the [0,1] domain. `x` is strictly
// increasing (i / (n - 1)); `y` is a deterministic gentle S-shape via a
// smoothstep-ish formula so every interpolation mode has real curvature to
// chew on (a straight line would shortcut the monotone/bezier solvers).

function makeAnchors(n: number): CurveEditorAnchor[] {
  const out: CurveEditorAnchor[] = Array.from({ length: n });
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : i / (n - 1);
    // smoothstep S-curve, nudged per-index so segments are not all identical.
    const s = x * x * (3 - 2 * x);
    const y = Math.min(1, Math.max(0, s + 0.05 * Math.sin(i)));
    out[i] = { id: `a${i}`, x, y };
  }
  return out;
}

// Same set, but carrying bezier tangents so the 'bezier' build/eval/path paths
// exercise the per-anchor handle branch (deltas relative to the anchor).
function makeAnchorsWithHandles(n: number): CurveEditorAnchor[] {
  const base = makeAnchors(n);
  const dx = n > 1 ? 1 / (n - 1) : 0;
  for (let i = 0; i < n; i++) {
    const a = base[i]!;
    base[i] = {
      ...a,
      inHandle: { x: -dx / 3, y: -0.03 },
      outHandle: { x: dx / 3, y: 0.03 },
    };
  }
  return base;
}

// Realistic editor scale (a tone/easing curve is typically 4–16 anchors) and a
// stress scale (a dense imported LUT / many keyframes).
const anchors16 = makeAnchors(16);
const anchors256 = makeAnchors(256);
const bezierAnchors16 = makeAnchorsWithHandles(16);
const bezierAnchors256 = makeAnchorsWithHandles(256);
const points16 = anchorsToPoints(anchors16);
const points256 = anchorsToPoints(anchors256);

// Shuffled (deterministically reversed-ish) copies to give `sortAnchors` real
// work instead of an already-sorted no-op.
function unsorted(src: readonly CurveEditorAnchor[]): CurveEditorAnchor[] {
  const a = src.slice();
  // deterministic interleave: pull from both ends.
  const out: CurveEditorAnchor[] = [];
  let lo = 0;
  let hi = a.length - 1;
  while (lo <= hi) {
    out.push(a[hi]!);
    if (lo !== hi) out.push(a[lo]!);
    lo++;
    hi--;
  }
  return out;
}
const unsorted16 = unsorted(anchors16);
const unsorted256 = unsorted(anchors256);

// Pre-built evaluators (for the sampling-only benches that should NOT pay the
// build cost on every iteration).
const evalLinear16 = buildEvaluator(anchors16, 'linear');
const evalMonotone16 = buildEvaluator(anchors16, 'monotone');
const evalCatmull16 = buildEvaluator(anchors16, 'catmull-rom');
const evalBezier16 = buildEvaluator(bezierAnchors16, 'bezier');
const evalMonotone256 = buildEvaluator(anchors256, 'monotone');

// A fixed grid of probe x's to sample the evaluator at (the render/LUT density).
function probeGrid(count: number): number[] {
  const xs: number[] = Array.from({ length: count });
  for (let i = 0; i < count; i++) xs[i] = i / (count - 1);
  return xs;
}
const probes256 = probeGrid(256);
const probes1024 = probeGrid(1024);

const clampOpts = {
  domainMin: 0,
  domainMax: 1,
  monotonicX: true,
  fixedEndpoints: true,
  minGap: 0.001,
};

// ─── 1. evaluator BUILD cost (per interpolation mode × scale) ────────────────
// `buildEvaluator` does the heavy precompute (monotone tangents, catmull-rom
// resample to a 256-pt table, bezier x-segment table). Rebuilt on every anchor
// edit (`evaluator = computed(() => buildEvaluator(...))`), so its build cost is
// on the edit hot path.

describe('buildEvaluator — build cost', () => {
  bench('linear — 16 anchors', () => {
    buildEvaluator(anchors16, 'linear');
  });
  bench('linear — 256 anchors', () => {
    buildEvaluator(anchors256, 'linear');
  });

  bench('monotone — 16 anchors', () => {
    buildEvaluator(anchors16, 'monotone');
  });
  bench('monotone — 256 anchors', () => {
    buildEvaluator(anchors256, 'monotone');
  });

  bench('catmull-rom — 16 anchors', () => {
    buildEvaluator(anchors16, 'catmull-rom');
  });
  bench('catmull-rom — 256 anchors', () => {
    buildEvaluator(anchors256, 'catmull-rom');
  });

  bench('bezier — 16 anchors', () => {
    buildEvaluator(bezierAnchors16, 'bezier');
  });
  bench('bezier — 256 anchors', () => {
    buildEvaluator(bezierAnchors256, 'bezier');
  });
});

// ─── 2. evaluator SAMPLING cost (pre-built closure × sample density) ─────────
// Calling `f(x)` densely is the render/LUT hot path. Each `f(x)` does a binary
// search + Hermite/linear eval (bezier additionally runs a Newton-Raphson
// per call). 256 = the editor's default sample density; 1024 = a fine LUT.

describe('evaluator sampling — 256 samples', () => {
  bench('linear', () => {
    for (let i = 0; i < probes256.length; i++) evalLinear16(probes256[i]!);
  });
  bench('monotone', () => {
    for (let i = 0; i < probes256.length; i++) evalMonotone16(probes256[i]!);
  });
  bench('catmull-rom', () => {
    for (let i = 0; i < probes256.length; i++) evalCatmull16(probes256[i]!);
  });
  bench('bezier (Newton-Raphson per call)', () => {
    for (let i = 0; i < probes256.length; i++) evalBezier16(probes256[i]!);
  });
});

describe('evaluator sampling — 1024 samples (stress)', () => {
  bench('monotone — 16 anchors', () => {
    for (let i = 0; i < probes1024.length; i++) evalMonotone16(probes1024[i]!);
  });
  bench('monotone — 256 anchors (deep binary search)', () => {
    for (let i = 0; i < probes1024.length; i++) evalMonotone256(probes1024[i]!);
  });
  bench('bezier — 16 anchors', () => {
    for (let i = 0; i < probes1024.length; i++) evalBezier16(probes1024[i]!);
  });
});

// ─── 3. build + sample combined (the full per-edit cost, default density) ────
// Mirrors what `CurveEditorRoot` pays each anchor edit: rebuild the evaluator,
// then re-sample the whole curve for the rendered polyline.

describe('build + sample 256 (full per-edit, 16 anchors)', () => {
  bench('monotone', () => {
    const f = buildEvaluator(anchors16, 'monotone');
    for (let i = 0; i < probes256.length; i++) f(probes256[i]!);
  });
  bench('catmull-rom', () => {
    const f = buildEvaluator(anchors16, 'catmull-rom');
    for (let i = 0; i < probes256.length; i++) f(probes256[i]!);
  });
  bench('bezier', () => {
    const f = buildEvaluator(bezierAnchors16, 'bezier');
    for (let i = 0; i < probes256.length; i++) f(probes256[i]!);
  });
});

// ─── 4. toLUT — pixel-application table (the consumer's apply hot path) ───────
// `CurveEditorRoot.toLUT()` → `splineToLUT(evaluator, size, x0, x1)`. The 256
// table backs an 8-bit channel; 1024 a higher-precision apply.

describe('toLUT — spline lookup table', () => {
  bench('monotone — 256 entries', () => {
    toLUT(evalMonotone16, 256, 0, 1);
  });
  bench('monotone — 1024 entries', () => {
    toLUT(evalMonotone16, 1024, 0, 1);
  });
  bench('bezier — 256 entries', () => {
    toLUT(evalBezier16, 256, 0, 1);
  });
});

// ─── 5. CurveEditorCurve path build (the SVG `d` hot path) ────────────────────
// The rendered curve recomputes its `d` whenever anchors/interpolation/scale
// change. Sampled modes: `sampleFnToPolyline` → project → `buildPolylinePath`.
// Bezier mode: chain `buildBezierPath` per segment.

const pxScale = 320; // a typical plot box in px.
function project(p: { x: number; y: number }): { x: number; y: number } {
  // value→pixel like CurveEditorPoint/Curve (y value-up): cheap linear map.
  return { x: p.x * pxScale, y: (1 - p.y) * pxScale };
}

describe('curve path `d` build — sampled polyline (256 samples)', () => {
  bench('monotone — sample + project + buildPolylinePath', () => {
    const samples = sampleFnToPolyline(x => evalMonotone16(x), 0, 1, 256);
    for (let i = 0; i < samples.length; i++) samples[i] = project(samples[i]!);
    buildPolylinePath(samples);
  });
  bench('catmull-rom — sample + project + buildPolylinePath', () => {
    const samples = sampleFnToPolyline(x => evalCatmull16(x), 0, 1, 256);
    for (let i = 0; i < samples.length; i++) samples[i] = project(samples[i]!);
    buildPolylinePath(samples);
  });
});

describe('curve path `d` build — bezier segment chain', () => {
  function buildBezierD(list: readonly CurveEditorAnchor[]): string {
    let d = '';
    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i]!;
      const b = list[i + 1]!;
      const dx = b.x - a.x;
      const c1x = a.outHandle ? a.x + a.outHandle.x : a.x + dx / 3;
      const c1y = a.outHandle ? a.y + a.outHandle.y : a.y + (b.y - a.y) / 3;
      const c2x = b.inHandle ? b.x + b.inHandle.x : b.x - dx / 3;
      const c2y = b.inHandle ? b.y + b.inHandle.y : b.y - (b.y - a.y) / 3;
      const seg = buildBezierPath(
        project({ x: a.x, y: a.y }),
        project({ x: c1x, y: c1y }),
        project({ x: c2x, y: c2y }),
        project({ x: b.x, y: b.y }),
      );
      d += i === 0 ? seg : seg.replace(/^M[^C]*/, '');
    }
    return d;
  }

  bench('16 anchors (15 segments)', () => {
    buildBezierD(bezierAnchors16);
  });
  bench('256 anchors (255 segments)', () => {
    buildBezierD(bezierAnchors256);
  });
});

// ─── 6. raw spline primitives (sub-operation baselines) ──────────────────────

describe('spline primitives — per-call baselines', () => {
  bench('linearInterpolate — 256-pt table lookup', () => {
    linearInterpolate(points256, 0.4321);
  });
  bench('catmullRom — 16-pt parametric eval', () => {
    catmullRom(points16, 0.4321);
  });
  bench('evalCubicBezier — single cubic eval', () => {
    evalCubicBezier(
      { x: 0, y: 0 },
      { x: 0.33, y: 0.1 },
      { x: 0.66, y: 0.9 },
      { x: 1, y: 1 },
      0.4321,
    );
  });
  bench('monotoneCubic — build closure (16 pts)', () => {
    monotoneCubic(points16);
  });
});

// ─── 7. anchor housekeeping (sort / project) at scale ────────────────────────

describe('anchor housekeeping', () => {
  bench('sortAnchors — 16 (unsorted)', () => {
    sortAnchors(unsorted16);
  });
  bench('sortAnchors — 256 (unsorted)', () => {
    sortAnchors(unsorted256);
  });
  bench('anchorsToPoints — 16', () => {
    anchorsToPoints(anchors16);
  });
  bench('anchorsToPoints — 256', () => {
    anchorsToPoints(anchors256);
  });
});

// ─── 8. pointer-move drag math (the pointermove hot path) ─────────────────────
// `CurveEditorPoint.onMove` → `clampAnchorX` + `clampAnchorY`. Pure clamp math,
// fired once per pointermove. Bench the clamp alone, and a simulated full
// `updateAnchor` step (clamp + slice-replace, the per-frame array churn).

describe('pointer-move clamp math', () => {
  bench('clampAnchorX — interior anchor (neighbour clamp), 16', () => {
    // index 8 has both neighbours → the monotonic-x branch does real work.
    clampAnchorX(anchors16, 8, 0.5321, clampOpts);
  });
  bench('clampAnchorX — interior anchor (neighbour clamp), 256', () => {
    clampAnchorX(anchors256, 128, 0.5321, clampOpts);
  });
  bench('clampAnchorY — domain clamp', () => {
    clampAnchorY(1.2345, 0, 1);
  });

  bench('simulated updateAnchor step — clamp + slice-replace, 16', () => {
    const list = anchors16;
    const index = 8;
    const cur = list[index]!;
    const x = clampAnchorX(list, index, 0.5321, clampOpts);
    const y = clampAnchorY(0.4567, 0, 1);
    const candidate = list.slice();
    candidate[index] = { ...cur, x, y };
  });
  bench('simulated updateAnchor step — clamp + slice-replace, 256', () => {
    const list = anchors256;
    const index = 128;
    const cur = list[index]!;
    const x = clampAnchorX(list, index, 0.5321, clampOpts);
    const y = clampAnchorY(0.4567, 0, 1);
    const candidate = list.slice();
    candidate[index] = { ...cur, x, y };
  });
});

// A full simulated drag stroke: 60 pointermove frames each rebuilding the
// evaluator + re-sampling (what one second of dragging at 60fps costs).
describe('simulated drag stroke (60 frames, monotone, 16 anchors)', () => {
  bench('clamp + rebuild + sample-256 per frame', () => {
    let list = anchors16;
    for (let frame = 0; frame < 60; frame++) {
      const index = 8;
      const cur = list[index]!;
      // deterministic sweep across the frame index (no Math.random).
      const nx = clampAnchorX(list, index, 0.3 + (frame / 60) * 0.4, clampOpts);
      const ny = clampAnchorY(0.2 + (frame / 60) * 0.6, 0, 1);
      const candidate = list.slice();
      candidate[index] = { ...cur, x: nx, y: ny };
      list = candidate;
      const f = buildEvaluator(list, 'monotone');
      for (let i = 0; i < probes256.length; i++) f(probes256[i]!);
    }
  });
});

// ─── 9. component mount — Root + N Points + Curve (realistic & stress) ────────

const wrappers: Array<VueWrapper<any>> = [];
function teardown(): void {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
}

function makeHarness(
  data: CurveEditorAnchor[],
  interpolation: CurveEditorInterpolation,
) {
  return defineComponent({
    setup: () => () => h(
      CurveEditorRoot,
      { defaultValue: data, interpolation },
      {
        default: ({ anchors }: { anchors: CurveEditorAnchor[] }) => [
          h(CurveEditorCurve),
          ...anchors.map(a => h(CurveEditorPoint, { key: a.id, anchor: a })),
        ],
      },
    ),
  });
}

const Harness50Monotone = makeHarness(makeAnchors(50), 'monotone');
const Harness500Monotone = makeHarness(makeAnchors(500), 'monotone');
const Harness50Bezier = makeHarness(makeAnchorsWithHandles(50), 'bezier');

describe('mount — Root + Curve + N Points', () => {
  bench('50 points (monotone)', () => {
    const w = mount(Harness50Monotone, { attachTo: document.body });
    wrappers.push(w);
    teardown();
  });
  bench('500 points (monotone, stress)', () => {
    const w = mount(Harness500Monotone, { attachTo: document.body });
    wrappers.push(w);
    teardown();
  });
  bench('50 points (bezier path)', () => {
    const w = mount(Harness50Bezier, { attachTo: document.body });
    wrappers.push(w);
    teardown();
  });
});

// ─── 10. re-render / update after a prop change ──────────────────────────────
// Switching interpolation and replacing the model both invalidate the evaluator
// + every point's projection + the curve `d`. Bench an in-place update via
// setProps (the realistic "user toggled mode / committed an edit" path).

const dataA = makeAnchors(50);
const dataB = makeAnchors(50).map((a, i) => ({ ...a, y: Math.min(1, a.y + 0.1 * Math.cos(i)) }));

function makeControlledHarness() {
  return defineComponent({
    props: {
      modelValue: { type: Array as () => CurveEditorAnchor[], required: true },
      interpolation: { type: String as () => CurveEditorInterpolation, default: 'monotone' },
    },
    setup: props => () => h(
      CurveEditorRoot,
      { modelValue: props.modelValue, interpolation: props.interpolation },
      {
        default: ({ anchors }: { anchors: CurveEditorAnchor[] }) => [
          h(CurveEditorCurve),
          ...anchors.map(a => h(CurveEditorPoint, { key: a.id, anchor: a })),
        ],
      },
    ),
  });
}
const ControlledHarness = makeControlledHarness();

describe('update after prop change (50 points)', () => {
  bench('switch interpolation monotone→bezier→monotone', async () => {
    const w = mount(ControlledHarness, {
      attachTo: document.body,
      props: { modelValue: dataA, interpolation: 'monotone' },
    });
    wrappers.push(w);
    await w.setProps({ interpolation: 'bezier' });
    await w.setProps({ interpolation: 'monotone' });
    teardown();
  });

  bench('replace model array (commit an edit)', async () => {
    const w = mount(ControlledHarness, {
      attachTo: document.body,
      props: { modelValue: dataA, interpolation: 'monotone' },
    });
    wrappers.push(w);
    await w.setProps({ modelValue: dataB });
    await w.setProps({ modelValue: dataA });
    teardown();
  });
});
