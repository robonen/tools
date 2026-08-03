import { describe, expect, it } from 'vitest';
import {
  findSnapPointIndex,
  projectSnapRelease,
  resolveSnapPointOffset,
  resolveSnapPointSize,
} from '../snapping';

const WINDOW = 800;
const REM = 16;

describe('resolveSnapPointSize', () => {
  it('treats numbers in (0, 1] as window fractions', () => {
    expect(resolveSnapPointSize(0.5, WINDOW, REM)).toBe(400);
    expect(resolveSnapPointSize(1, WINDOW, REM)).toBe(WINDOW);
  });

  it('treats numbers above 1 as pixels', () => {
    expect(resolveSnapPointSize(620, WINDOW, REM)).toBe(620);
  });

  it('parses px strings', () => {
    expect(resolveSnapPointSize('148px', WINDOW, REM)).toBe(148);
    expect(resolveSnapPointSize('148.6px', WINDOW, REM)).toBe(149);
  });

  it('parses rem strings against the root font size', () => {
    expect(resolveSnapPointSize('30rem', WINDOW, REM)).toBe(480);
    expect(resolveSnapPointSize('30rem', WINDOW, 20)).toBe(600);
  });

  it('rejects unknown units and degenerate values', () => {
    expect(resolveSnapPointSize('50%', WINDOW, REM)).toBeNull();
    expect(resolveSnapPointSize('10vh', WINDOW, REM)).toBeNull();
    expect(resolveSnapPointSize('abc', WINDOW, REM)).toBeNull();
    expect(resolveSnapPointSize('-10px', WINDOW, REM)).toBeNull();
    expect(resolveSnapPointSize(0, WINDOW, REM)).toBeNull();
    expect(resolveSnapPointSize(-0.5, WINDOW, REM)).toBeNull();
    expect(resolveSnapPointSize(Number.NaN, WINDOW, REM)).toBeNull();
  });
});

describe('resolveSnapPointOffset', () => {
  it('signs the translate toward the anchored edge', () => {
    expect(resolveSnapPointOffset(0.25, 'bottom', WINDOW, REM)).toBe(600);
    expect(resolveSnapPointOffset(0.25, 'right', WINDOW, REM)).toBe(600);
    expect(resolveSnapPointOffset(0.25, 'top', WINDOW, REM)).toBe(-600);
    expect(resolveSnapPointOffset(0.25, 'left', WINDOW, REM)).toBe(-600);
  });

  it('clamps oversized snap points at fully open', () => {
    expect(resolveSnapPointOffset(1200, 'bottom', WINDOW, REM)).toBe(0);
  });

  it('maps invalid points to NaN', () => {
    expect(resolveSnapPointOffset('50%', 'bottom', WINDOW, REM)).toBeNaN();
  });
});

describe('findSnapPointIndex', () => {
  const points = [0.25, '400px', '30rem'];

  it('matches by identity first', () => {
    expect(findSnapPointIndex(points, '400px', WINDOW, REM)).toBe(1);
  });

  it('matches equivalent representations by resolved size', () => {
    expect(findSnapPointIndex(points, 0.5, WINDOW, REM)).toBe(1); // 0.5 * 800 = 400px
    expect(findSnapPointIndex(points, 480, WINDOW, REM)).toBe(2); // 30rem = 480px
  });

  it('returns null when nothing matches', () => {
    expect(findSnapPointIndex(points, 0.9, WINDOW, REM)).toBeNull();
    expect(findSnapPointIndex(points, null, WINDOW, REM)).toBeNull();
    expect(findSnapPointIndex(points, undefined, WINDOW, REM)).toBeNull();
  });
});

describe('projectSnapRelease', () => {
  // Dismiss-positive space on an 800px-tall drawer: fully open = 0, closed = 800.
  const base = {
    offsets: [600, 400, 0], // least → most visible
    drawerSize: 800,
    dismissible: true,
    sequential: false,
  };

  it('snaps to the point nearest the drag target when slow', () => {
    // From 600, dragged 180 toward open → 420 → nearest is 400.
    expect(projectSnapRelease({
      ...base,
      activeIndex: 0,
      draggedDistance: 180,
      velocity: 0,
    })).toEqual({ type: 'snap', index: 1 });
  });

  it('stays on the active point after a tiny slow drag', () => {
    expect(projectSnapRelease({
      ...base,
      activeIndex: 0,
      draggedDistance: 40,
      velocity: 0,
    })).toEqual({ type: 'snap', index: 0 });
  });

  it('projects a fling across points the drag alone would not reach', () => {
    // From 600, dragged only 40 toward open, but flung at -1.5 px/ms
    // (toward open) → 560 - 450 = 110 → nearest is 0 (fully open).
    expect(projectSnapRelease({
      ...base,
      activeIndex: 0,
      draggedDistance: 40,
      velocity: -1.5,
    })).toEqual({ type: 'snap', index: 2 });
  });

  it('closes when the projection lands nearer to fully-closed', () => {
    // From 600, dragged 100 toward dismiss → 700; 100 from closed vs 100 from
    // 600 — ties stay open; add a dismiss fling to push past.
    expect(projectSnapRelease({
      ...base,
      activeIndex: 0,
      draggedDistance: -100,
      velocity: 0.6,
    })).toEqual({ type: 'close' });
  });

  it('never closes a non-dismissible drawer', () => {
    expect(projectSnapRelease({
      ...base,
      dismissible: false,
      activeIndex: 0,
      draggedDistance: -150,
      velocity: 2,
    })).toEqual({ type: 'snap', index: 0 });
  });

  it('clamps the fling velocity', () => {
    // Absurd velocity toward open must land on the last point, not overshoot
    // into an invalid index.
    expect(projectSnapRelease({
      ...base,
      activeIndex: 0,
      draggedDistance: 0,
      velocity: -50,
    })).toEqual({ type: 'snap', index: 2 });
  });

  it('skips NaN offsets', () => {
    expect(projectSnapRelease({
      ...base,
      offsets: [600, Number.NaN, 0],
      activeIndex: 0,
      draggedDistance: 250, // → 350, nearest usable is 600? |350-600|=250 vs |350-0|=350
      velocity: 0,
    })).toEqual({ type: 'snap', index: 0 });
  });

  describe('sequential mode', () => {
    const sequential = { ...base, sequential: true };

    it('advances a single step on a physical crossing', () => {
      // From 600 dragged far toward open (target 100, crossed 400) — but only
      // one step is allowed.
      expect(projectSnapRelease({
        ...sequential,
        activeIndex: 0,
        draggedDistance: 500,
        velocity: 0,
      })).toEqual({ type: 'snap', index: 1 });
    });

    it('advances on a fast fling without a crossing', () => {
      expect(projectSnapRelease({
        ...sequential,
        activeIndex: 1,
        draggedDistance: 60,
        velocity: -0.8,
      })).toEqual({ type: 'snap', index: 2 });
    });

    it('stays put on a slow drag without a crossing', () => {
      expect(projectSnapRelease({
        ...sequential,
        activeIndex: 1,
        draggedDistance: 60,
        velocity: 0,
      })).toEqual({ type: 'snap', index: 1 });
    });
  });
});
