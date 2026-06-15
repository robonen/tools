import { bench, describe } from 'vitest';
import { defineComponent, h, nextTick, render, shallowRef } from 'vue';
import { computeFrame, resolveAxisLock, usePointerDrag } from '..';
import type { DragBounds, DragModifiers, EffectiveAxis, Point } from '..';

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic fixtures (NO Math.random — every value is a pure formula of its
// index). Built once at module scope so bench bodies stay allocation-light.
// ─────────────────────────────────────────────────────────────────────────────

const ORIGIN: Point = { x: 0, y: 0 };

const NO_MOD: DragModifiers = { shift: false, alt: false, ctrl: false, meta: false };
const SHIFT: DragModifiers = { shift: true, alt: false, ctrl: false, meta: false };

const BOUNDS: DragBounds = { minX: -500, maxX: 500, minY: -500, maxY: 500 };

/** A tracked element rect (computeFrame only reads `.left` / `.top`). */
const RECT = { left: 120, top: 240 } as DOMRect;

/**
 * Build a deterministic stream of pointer positions emulating one drag gesture.
 * The x/y describe a slewing diagonal sweep so axis-lock, snap, and clamp all
 * exercise non-trivial branches across the stream.
 */
function buildPointerStream(n: number): Point[] {
  const out: Point[] = new Array(n);
  for (let i = 0; i < n; i++) {
    // Coupled but non-degenerate per-axis growth; integers keep snap meaningful.
    out[i] = {
      x: ((i * 7) % 211) - 105 + (i % 3),
      y: ((i * 13) % 197) - 98 + (i % 5),
    };
  }
  return out;
}

const STREAM_100 = buildPointerStream(100);
const STREAM_1000 = buildPointerStream(1000);

/** A matching stream of modifier snapshots so shift-lock fires on a 1/4 cadence. */
function buildModifierStream(n: number): DragModifiers[] {
  const out: DragModifiers[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = i % 4 === 0 ? SHIFT : NO_MOD;
  return out;
}

const MODS_100 = buildModifierStream(100);
const MODS_1000 = buildModifierStream(1000);

// ─────────────────────────────────────────────────────────────────────────────
// resolveAxisLock — the per-frame axis-lock decision (called once per flush).
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveAxisLock — per-frame axis decision', () => {
  bench('static axis "x" — fast path (100 frames)', () => {
    for (let i = 0; i < 100; i++) resolveAxisLock('x', true, MODS_100[i]!, STREAM_100[i]!);
  });

  bench('axis "both", no shift-lock (100 frames)', () => {
    for (let i = 0; i < 100; i++) resolveAxisLock('both', false, MODS_100[i]!, STREAM_100[i]!);
  });

  bench('axis "both" + shift-lock dominant-axis pick (100 frames)', () => {
    for (let i = 0; i < 100; i++) resolveAxisLock('both', true, MODS_100[i]!, STREAM_100[i]!);
  });

  bench('axis "both" + shift-lock dominant-axis pick (1000 frames)', () => {
    for (let i = 0; i < 1000; i++) resolveAxisLock('both', true, MODS_1000[i]!, STREAM_1000[i]!);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeFrame — the pure per-frame math (raw total → axis lock → snap → clamp).
// This is THE hot path: one call per coalesced rAF flush per active gesture.
// ─────────────────────────────────────────────────────────────────────────────

describe('computeFrame — single frame (feature on/off matrix)', () => {
  bench('free move, no snap/bounds/rect', () => {
    computeFrame({
      start: ORIGIN,
      last: { x: 137, y: 211 },
      rect: undefined,
      axis: 'none',
      snapGrid: undefined,
      bounds: undefined,
      prevTotal: ORIGIN,
    });
  });

  bench('axis-locked + scalar snap + bounds + rect (all features)', () => {
    computeFrame({
      start: ORIGIN,
      last: { x: 137, y: 211 },
      rect: RECT,
      axis: 'x',
      snapGrid: 10,
      bounds: BOUNDS,
      prevTotal: { x: 50, y: 0 },
    });
  });

  bench('tuple snap + bounds (per-axis grid)', () => {
    computeFrame({
      start: ORIGIN,
      last: { x: 137, y: 211 },
      rect: RECT,
      axis: 'none',
      snapGrid: [10, 25],
      bounds: BOUNDS,
      prevTotal: { x: 40, y: 60 },
    });
  });
});

describe('computeFrame — full gesture stream', () => {
  bench('100 frames — free move (no snap/bounds)', () => {
    const prev: Point = { x: 0, y: 0 };
    for (let i = 0; i < 100; i++) {
      const f = computeFrame({
        start: ORIGIN,
        last: STREAM_100[i]!,
        rect: undefined,
        axis: 'none',
        snapGrid: undefined,
        bounds: undefined,
        prevTotal: prev,
      });
      prev.x = f.total.x;
      prev.y = f.total.y;
    }
  });

  bench('100 frames — snap + bounds + rect', () => {
    const prev: Point = { x: 0, y: 0 };
    for (let i = 0; i < 100; i++) {
      const f = computeFrame({
        start: ORIGIN,
        last: STREAM_100[i]!,
        rect: RECT,
        axis: 'none',
        snapGrid: 10,
        bounds: BOUNDS,
        prevTotal: prev,
      });
      prev.x = f.total.x;
      prev.y = f.total.y;
    }
  });

  bench('1000 frames — snap + bounds + rect (stress)', () => {
    const prev: Point = { x: 0, y: 0 };
    for (let i = 0; i < 1000; i++) {
      const f = computeFrame({
        start: ORIGIN,
        last: STREAM_1000[i]!,
        rect: RECT,
        axis: 'none',
        snapGrid: 10,
        bounds: BOUNDS,
        prevTotal: prev,
      });
      prev.x = f.total.x;
      prev.y = f.total.y;
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Simulated flush pipeline — mirrors usePointerDrag's `flush()`: derive the raw
// total, resolveAxisLock against live modifiers, then computeFrame. This is the
// real per-pointermove cost minus the reactive write-back.
// ─────────────────────────────────────────────────────────────────────────────

function simulateFlush(
  stream: Point[],
  mods: DragModifiers[],
  withFeatures: boolean,
): Point {
  const start: Point = { x: 0, y: 0 };
  const prev: Point = { x: 0, y: 0 };
  const snapGrid = withFeatures ? 10 : undefined;
  const bounds = withFeatures ? BOUNDS : undefined;
  const rect = withFeatures ? RECT : undefined;
  for (let i = 0; i < stream.length; i++) {
    const last = stream[i]!;
    const rawTotal: Point = { x: last.x - start.x, y: last.y - start.y };
    const effectiveAxis: EffectiveAxis = resolveAxisLock('both', true, mods[i]!, rawTotal);
    const frame = computeFrame({ start, last, rect, axis: effectiveAxis, snapGrid, bounds, prevTotal: prev });
    prev.x = frame.total.x;
    prev.y = frame.total.y;
  }
  return prev;
}

describe('simulated flush() pipeline — resolveAxisLock + computeFrame', () => {
  bench('100 moves — shift-lock, no snap/bounds', () => {
    simulateFlush(STREAM_100, MODS_100, false);
  });

  bench('100 moves — shift-lock + snap + bounds + rect', () => {
    simulateFlush(STREAM_100, MODS_100, true);
  });

  bench('1000 moves — shift-lock + snap + bounds + rect (stress)', () => {
    simulateFlush(STREAM_1000, MODS_1000, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Component setup cost — usePointerDrag must run inside a component scope
// (reactive() + onScopeDispose). Bench the mount of N draggable instances, the
// realistic editor scale where one canvas hosts many independent drag handles.
// ─────────────────────────────────────────────────────────────────────────────

const DRAG_OPTIONS = {
  axis: 'both',
  lockAxisOnShift: true,
  threshold: 3,
  snapGrid: 10,
  bounds: BOUNDS,
  trackElementRect: true,
} as const;

/** A host that wires N independent usePointerDrag instances, one per handle. */
const DraggableHost = defineComponent({
  props: { count: { type: Number, required: true } },
  setup(props) {
    const refs: Array<ReturnType<typeof shallowRef<HTMLElement | null>>> = [];
    for (let i = 0; i < props.count; i++) {
      const el = shallowRef<HTMLElement | null>(null);
      usePointerDrag(el, DRAG_OPTIONS);
      refs.push(el);
    }
    return () =>
      h(
        'div',
        refs.map((el, i) => h('div', { ref: el, key: i, style: 'width:16px;height:16px;' })),
      );
  },
});

describe('usePointerDrag — mount N instances', () => {
  bench('mount 50 draggable handles', () => {
    const container = document.createElement('div');
    render(h(DraggableHost, { count: 50 }), container);
    render(null, container);
  });

  bench('mount 500 draggable handles (stress)', () => {
    const container = document.createElement('div');
    render(h(DraggableHost, { count: 500 }), container);
    render(null, container);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Re-render after a prop change — remount the host at a new count to measure the
// teardown (onScopeDispose) + re-setup cost of the drag wiring under churn.
// ─────────────────────────────────────────────────────────────────────────────

describe('usePointerDrag — update after prop change', () => {
  bench('50 handles → re-render to 60 handles', () => {
    const container = document.createElement('div');
    render(h(DraggableHost, { count: 50 }), container);
    render(h(DraggableHost, { count: 60 }), container);
    render(null, container);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Realistic single-handle drag round-trip via the live composable: real pointer
// events through the captured window listeners + rAF-coalesced flush.
// ─────────────────────────────────────────────────────────────────────────────

function dispatch(el: Element, type: string, x: number, y: number): void {
  el.dispatchEvent(
    new PointerEvent(type, { pointerId: 1, button: 0, clientX: x, clientY: y, bubbles: true, cancelable: true }),
  );
}

function raf(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

describe('usePointerDrag — live event round-trip (rAF-coalesced)', () => {
  bench('mount + down + 20 moves + up', async () => {
    const el = shallowRef<HTMLElement | null>(null);
    const Harness = defineComponent({
      setup() {
        usePointerDrag(el, DRAG_OPTIONS);
        return () => h('div', { ref: el, style: 'width:200px;height:200px;' });
      },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(h(Harness), container);
    await nextTick();

    const node = el.value!;
    dispatch(node, 'pointerdown', 0, 0);
    for (let i = 0; i < 20; i++) {
      const p = STREAM_100[i]!;
      dispatch(node, 'pointermove', p.x, p.y);
      await raf(); // one coalesced flush per burst, as the composable schedules
    }
    dispatch(node, 'pointerup', STREAM_100[19]!.x, STREAM_100[19]!.y);
    await raf();

    render(null, container);
    container.remove();
  });
});
