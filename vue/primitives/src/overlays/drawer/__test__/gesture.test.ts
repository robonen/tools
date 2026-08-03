import { afterEach, describe, expect, it } from 'vitest';
import {
  computeSettleDuration,
  createReverseCancelTracker,
  createVelocityTracker,
  findScrollableAncestor,
  isAtScrollEdge,
} from '../gesture';
import { MAX_VELOCITY_AGE, MIN_SETTLE_DURATION, MIN_VELOCITY_DT, TRANSITIONS } from '../constants';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createVelocityTracker', () => {
  it('computes instantaneous velocity from the trailing pair of samples', () => {
    const tracker = createVelocityTracker();

    tracker.add(0, 0);
    tracker.add(10, 20); // 0.5 px/ms — but superseded below
    tracker.add(50, 40); // (50-10)/20 = 2 px/ms

    expect(tracker.read(45)).toBe(2);
  });

  it('reads 0 when the pointer paused before release', () => {
    const tracker = createVelocityTracker();

    tracker.add(0, 0);
    tracker.add(100, 20);

    expect(tracker.read(20 + MAX_VELOCITY_AGE + 1)).toBe(0);
  });

  it('clamps tiny sample intervals so same-frame bursts do not spike', () => {
    const tracker = createVelocityTracker();

    tracker.add(0, 0);
    tracker.add(32, 1); // dt clamped 1 → MIN_VELOCITY_DT

    expect(tracker.read(2)).toBe(32 / MIN_VELOCITY_DT);
  });

  it('reads 0 before two samples exist', () => {
    const tracker = createVelocityTracker();

    expect(tracker.read(0)).toBe(0);
    tracker.add(10, 0);
    expect(tracker.read(1)).toBe(0);
  });

  it('ignores out-of-order samples', () => {
    const tracker = createVelocityTracker();

    tracker.add(0, 100);
    tracker.add(50, 120);
    tracker.add(999, 90); // stale timestamp — must not produce a velocity

    expect(tracker.read(121)).toBe(50 / 20);
  });
});

describe('createReverseCancelTracker', () => {
  it('cancels once an armed gesture pulls back past the threshold', () => {
    const tracker = createReverseCancelTracker();

    tracker.update(60); // armed (> 20)
    expect(tracker.cancelled).toBe(false);

    tracker.update(45); // pulled back 15 > 10
    expect(tracker.cancelled).toBe(true);
  });

  it('does not cancel before the arm distance', () => {
    const tracker = createReverseCancelTracker();

    tracker.update(15);
    tracker.update(0); // pulled back 15, but max never armed

    expect(tracker.cancelled).toBe(false);
  });

  it('tolerates jitter below the reverse threshold', () => {
    const tracker = createReverseCancelTracker();

    tracker.update(80);
    tracker.update(72); // only 8 back

    expect(tracker.cancelled).toBe(false);
  });

  it('re-arms when the drag surpasses its previous furthest point', () => {
    const tracker = createReverseCancelTracker();

    tracker.update(60);
    tracker.update(40);
    expect(tracker.cancelled).toBe(true);

    tracker.update(70); // renewed intent
    expect(tracker.cancelled).toBe(false);
  });
});

describe('computeSettleDuration', () => {
  it('keeps the default duration for slow releases', () => {
    expect(computeSettleDuration(300, 0.1)).toBe(TRANSITIONS.DURATION);
    expect(computeSettleDuration(300, 0)).toBe(TRANSITIONS.DURATION);
  });

  it('scales the duration down with a hard flick', () => {
    // 100px left at 2px/ms → 50ms, clamped up to the minimum.
    expect(computeSettleDuration(100, 2)).toBe(MIN_SETTLE_DURATION / 1000);
    // 400px left at 1px/ms → 400ms.
    expect(computeSettleDuration(400, 1)).toBe(0.4);
  });

  it('never exceeds the default duration', () => {
    expect(computeSettleDuration(10_000, 0.5)).toBe(TRANSITIONS.DURATION);
  });

  it('falls back on degenerate distances', () => {
    expect(computeSettleDuration(0, 3)).toBe(TRANSITIONS.DURATION);
    expect(computeSettleDuration(Number.NaN, 3)).toBe(TRANSITIONS.DURATION);
  });
});

function scrollableFixture() {
  document.body.innerHTML = `
    <div id="drawer" style="height: 200px;">
      <div id="scroller" style="height: 100px; width: 100px; overflow: auto;">
        <div id="inner" style="height: 400px; width: 400px;">
          <span id="leaf">content</span>
        </div>
      </div>
    </div>
  `;

  return {
    drawer: document.getElementById('drawer')! as HTMLElement,
    scroller: document.getElementById('scroller')! as HTMLElement,
    leaf: document.getElementById('leaf')! as HTMLElement,
  };
}

describe('findScrollableAncestor', () => {
  it('finds the nearest scrollable ancestor along the axis', () => {
    const { drawer, scroller, leaf } = scrollableFixture();

    expect(findScrollableAncestor(leaf, drawer, 'y')).toBe(scroller);
    expect(findScrollableAncestor(leaf, drawer, 'x')).toBe(scroller);
  });

  it('returns null when nothing scrolls', () => {
    const { drawer } = scrollableFixture();

    expect(findScrollableAncestor(drawer, drawer, 'y')).toBeNull();
  });

  it('stops at the boundary', () => {
    const { scroller, leaf } = scrollableFixture();
    const inner = document.getElementById('inner')! as HTMLElement;

    // Boundary below the scroller — the walk must not escape it.
    expect(findScrollableAncestor(leaf, inner, 'y')).toBeNull();
    void scroller;
  });

  it('ignores overflow visible/hidden containers', () => {
    document.body.innerHTML = `
      <div id="drawer">
        <div id="clipped" style="height: 50px; overflow: hidden;">
          <div style="height: 300px;"><span id="leaf">x</span></div>
        </div>
      </div>
    `;

    const drawer = document.getElementById('drawer')! as HTMLElement;
    const leaf = document.getElementById('leaf')! as HTMLElement;

    expect(findScrollableAncestor(leaf, drawer, 'y')).toBeNull();
  });
});

describe('isAtScrollEdge', () => {
  it('bottom drawer requires the scroller at its top', () => {
    const { scroller } = scrollableFixture();

    scroller.scrollTop = 0;
    expect(isAtScrollEdge(scroller, 'bottom')).toBe(true);

    scroller.scrollTop = 50;
    expect(isAtScrollEdge(scroller, 'bottom')).toBe(false);
  });

  it('top drawer requires the scroller at its bottom', () => {
    const { scroller } = scrollableFixture();

    scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
    expect(isAtScrollEdge(scroller, 'top')).toBe(true);

    scroller.scrollTop = 0;
    expect(isAtScrollEdge(scroller, 'top')).toBe(false);
  });

  it('right drawer requires the scroller at its left edge', () => {
    const { scroller } = scrollableFixture();

    scroller.scrollLeft = 0;
    expect(isAtScrollEdge(scroller, 'right')).toBe(true);

    scroller.scrollLeft = 40;
    expect(isAtScrollEdge(scroller, 'right')).toBe(false);
  });

  it('left drawer requires the scroller at its right edge', () => {
    const { scroller } = scrollableFixture();

    scroller.scrollLeft = scroller.scrollWidth - scroller.clientWidth;
    expect(isAtScrollEdge(scroller, 'left')).toBe(true);

    scroller.scrollLeft = 0;
    expect(isAtScrollEdge(scroller, 'left')).toBe(false);
  });
});
