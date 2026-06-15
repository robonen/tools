import { bench, describe } from 'vitest';
import { reactive } from 'vue';

// Isolates the core of the usePointerDrag fix. The drag state used to be a deep
// `reactive()` object whose ~13 nested fields are rewritten on every animation
// frame of a drag (see flush()), each assignment paying a Proxy set-trap plus a
// subscriber-less trigger. The fix makes it a plain object. This benches ONLY the
// per-frame writes (state allocated once at module scope, so the proxy-creation
// cost is excluded) — a deterministic, noise-immune view of what changed.

interface Pt { x: number; y: number }
interface DragStateShape {
  startPoint: Pt;
  point: Pt;
  elementPoint: Pt;
  delta: Pt;
  total: Pt;
  axis: string;
  modifiers: { shift: boolean; alt: boolean; ctrl: boolean; meta: boolean };
  pointerId: number;
  pointerType: string;
}

function makeShape(): DragStateShape {
  return {
    startPoint: { x: 0, y: 0 },
    point: { x: 0, y: 0 },
    elementPoint: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
    total: { x: 0, y: 0 },
    axis: 'none',
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    pointerId: -1,
    pointerType: '',
  };
}

/** Mirror flush()'s per-frame field writes (the ~13 assignments per frame). */
function writeFrame(s: DragStateShape, i: number): void {
  s.point.x = i;
  s.point.y = i;
  s.elementPoint.x = i;
  s.elementPoint.y = i;
  s.delta.x = 1;
  s.delta.y = 1;
  s.total.x = i;
  s.total.y = i;
  s.axis = i % 2 ? 'x' : 'none';
  s.modifiers.shift = (i & 1) === 0;
}

// Allocated ONCE so the bench measures per-frame writes, not proxy construction.
const reactiveState = reactive(makeShape());
const plainState = makeShape();

const FRAMES = 1000;

describe('drag-state per-frame writes — OLD reactive() vs NEW plain object', () => {
  bench('OLD — reactive() state · 1000 frames', () => {
    for (let i = 0; i < FRAMES; i++) writeFrame(reactiveState, i);
  });

  bench('NEW — plain object state · 1000 frames', () => {
    for (let i = 0; i < FRAMES; i++) writeFrame(plainState, i);
  });
});
