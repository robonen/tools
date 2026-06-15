import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import type { SnapTarget } from '..';
import {
  applyHysteresis,
  edgeTargets,
  findNearestTarget,
  gridTargets,
  pointTargets,
  useSnapping,
} from '..';

function target(px: number, kind: SnapTarget['kind'] = 'grid', id?: string): SnapTarget {
  return { axis: 'x', px, value: px, kind, id };
}

describe('findNearestTarget', () => {
  it('picks the nearest target within threshold', () => {
    const targets = [target(0), target(10), target(25)];
    const { index, deltaPx } = findNearestTarget(12, targets, 8);
    expect(index).toBe(1);
    // target.px - targetPx = 10 - 12 = -2
    expect(deltaPx).toBe(-2);
  });

  it('returns -1 / Infinity when none are in range', () => {
    const targets = [target(0), target(100)];
    const { index, deltaPx } = findNearestTarget(50, targets, 8);
    expect(index).toBe(-1);
    expect(deltaPx).toBe(Infinity);
  });

  it('handles an empty target list', () => {
    const { index, deltaPx } = findNearestTarget(5, [], 8);
    expect(index).toBe(-1);
    expect(deltaPx).toBe(Infinity);
  });

  it('lets a higher-priority kind win within relaxPx even if farther', () => {
    // grid at 10 (dist 2), playhead at 14 (dist 2 vs target 12)... make playhead farther.
    const targets = [
      target(10, 'grid'), // dist from 12 = 2
      target(15, 'playhead'), // dist from 12 = 3
    ];
    const priority = { order: ['playhead', 'grid'] as Array<SnapTarget['kind']>, relaxPx: 2 };
    const { index } = findNearestTarget(12, targets, 8, priority);
    // playhead is 1px farther but within relaxPx=2, and higher priority -> wins.
    expect(index).toBe(1);
    expect(targets[index]!.kind).toBe('playhead');
  });

  it('does NOT let a higher-priority kind win beyond relaxPx', () => {
    const targets = [
      target(10, 'grid'), // dist 2
      target(18, 'playhead'), // dist 6
    ];
    const priority = { order: ['playhead', 'grid'] as Array<SnapTarget['kind']>, relaxPx: 2 };
    const { index } = findNearestTarget(12, targets, 8, priority);
    // playhead is 4px farther (> relaxPx 2) -> nearest grid wins.
    expect(targets[index]!.kind).toBe('grid');
  });

  it('skips excluded ids (string)', () => {
    const targets = [target(11, 'edge', 'self'), target(20, 'edge', 'other')];
    const { index } = findNearestTarget(12, targets, 10, undefined, 'self');
    expect(index).toBe(1);
    expect(targets[index]!.id).toBe('other');
  });

  it('skips excluded ids (set)', () => {
    const targets = [target(11, 'edge', 'a'), target(13, 'edge', 'b'), target(20, 'edge', 'c')];
    const exclude = new Set(['a', 'b']);
    const { index } = findNearestTarget(12, targets, 10, undefined, exclude);
    expect(targets[index]!.id).toBe('c');
  });

  it('widens the locked target threshold by hysteresisPx', () => {
    // locked target at 0, candidate at 9. Base threshold 8 would miss it,
    // but hysteresisPx 4 widens reach to 12 -> hit.
    const targets = [target(0, 'edge', 'locked')];
    const miss = findNearestTarget(9, targets, 8);
    expect(miss.index).toBe(-1);
    const hit = findNearestTarget(9, targets, 8, undefined, undefined, 'locked', 4);
    expect(hit.index).toBe(0);
  });
});

describe('applyHysteresis', () => {
  it('takes a fresh lock when there is no prior lock', () => {
    expect(applyHysteresis(undefined, 'a', 3, Infinity, 8, 0.5)).toBe(true);
  });

  it('keeps the lock when best is still the locked target', () => {
    expect(applyHysteresis('a', 'a', 5, 5, 8, 0.5)).toBe(true);
  });

  it('does not steal when prior lock is in band and new best is not strictly closer', () => {
    // prevDist 4 within release band 8*1.5=12; bestDist 4 not < 4 -> keep lock.
    expect(applyHysteresis('a', 'b', 4, 4, 8, 0.5)).toBe(false);
  });

  it('steals when the new best is strictly closer and prior still in band', () => {
    expect(applyHysteresis('a', 'b', 2, 5, 8, 0.5)).toBe(true);
  });

  it('releases the lock once the prior target leaves the widened band', () => {
    // releaseBand = 8 * 1.5 = 12; prevDist 13 > 12 -> release/steal even though farther.
    expect(applyHysteresis('a', 'b', 20, 13, 8, 0.5)).toBe(true);
  });

  it('returns false when nothing is in range', () => {
    expect(applyHysteresis('a', undefined, Infinity, Infinity, 8, 0.5)).toBe(false);
  });
});

describe('gridTargets', () => {
  it('anchors lines at floor(domainStart/step)*step and projects', () => {
    const project = (v: number) => v * 2; // px = value * 2
    const targets = gridTargets(3, 12, 5, project, 'x');
    // anchor = floor(3/5)*5 = 0; first line >= 3 is 5, then 10.
    expect(targets.map(t => t.value)).toEqual([5, 10]);
    expect(targets.map(t => t.px)).toEqual([10, 20]);
    expect(targets.every(t => t.kind === 'grid' && t.axis === 'x')).toBe(true);
  });

  it('includes a line exactly at domainStart when aligned', () => {
    const targets = gridTargets(10, 20, 5, v => v, 'x');
    expect(targets.map(t => t.value)).toEqual([10, 15, 20]);
  });

  it('returns empty for non-positive or non-finite step', () => {
    expect(gridTargets(0, 10, 0, v => v, 'x')).toEqual([]);
    expect(gridTargets(0, 10, -1, v => v, 'x')).toEqual([]);
    expect(gridTargets(0, 10, Infinity, v => v, 'x')).toEqual([]);
  });

  it('returns empty when domainEnd precedes domainStart', () => {
    expect(gridTargets(20, 10, 5, v => v, 'x')).toEqual([]);
  });
});

describe('edgeTargets', () => {
  it('emits left/right/center on x', () => {
    const rects = [{ left: 0, right: 10, top: 0, bottom: 4, id: 'clip' }];
    const targets = edgeTargets(rects, 'x', v => v);
    expect(targets.map(t => [t.value, t.kind])).toEqual([
      [0, 'edge'],
      [10, 'edge'],
      [5, 'center'],
    ]);
    expect(targets.every(t => t.id === 'clip' && t.axis === 'x')).toBe(true);
  });

  it('emits top/bottom/center on y', () => {
    const rects = [{ left: 0, right: 10, top: 2, bottom: 8 }];
    const targets = edgeTargets(rects, 'y', v => v);
    expect(targets.map(t => t.value)).toEqual([2, 8, 5]);
  });
});

describe('pointTargets', () => {
  it('builds projected targets with optional ids', () => {
    const targets = pointTargets([10, 20], 'marker', 'x', v => v * 3, ['m1', 'm2']);
    expect(targets.map(t => [t.value, t.px, t.id, t.kind])).toEqual([
      [10, 30, 'm1', 'marker'],
      [20, 60, 'm2', 'marker'],
    ]);
  });

  it('omits ids when not supplied', () => {
    const targets = pointTargets([5], 'stop', 'x', v => v);
    expect(targets[0]!.id).toBeUndefined();
  });
});

describe('useSnapping', () => {
  const targets: SnapTarget[] = [
    { axis: 'x', px: 100, value: 1, kind: 'grid' },
    { axis: 'x', px: 200, value: 2, kind: 'grid' },
  ];

  it('snaps when within threshold (identity projection)', () => {
    const engine = useSnapping({ targets, thresholdPx: 8 });
    const r = engine.snap1d(104); // 4px from px=100 -> snaps to value 1
    expect(r.snapped).toBe(true);
    expect(r.value).toBe(1);
    expect(r.target?.px).toBe(100);
    expect(r.deltaPx).toBe(-4);
    expect(engine.isSnapped.value).toBe(true);
    expect(engine.activeTargets.value).toHaveLength(1);
  });

  it('passes through unchanged when out of range', () => {
    const engine = useSnapping({ targets, thresholdPx: 8 });
    const r = engine.snap1d(150);
    expect(r.snapped).toBe(false);
    expect(r.value).toBe(150);
    expect(r.target).toBeNull();
    expect(r.deltaPx).toBe(0);
    expect(engine.isSnapped.value).toBe(false);
    expect(engine.activeTargets.value).toEqual([]);
  });

  it('passes through unchanged when disabled', () => {
    const enabled = ref(false);
    const engine = useSnapping({ targets, thresholdPx: 8, enabled });
    const r = engine.snap1d(104);
    expect(r.snapped).toBe(false);
    expect(r.value).toBe(104);
    expect(engine.isSnapped.value).toBe(false);
  });

  it('reacts to a ref/getter threshold', () => {
    const thresholdPx = ref(2);
    const engine = useSnapping({ targets, thresholdPx });
    expect(engine.snap1d(104).snapped).toBe(false); // 4 > 2
    thresholdPx.value = 8;
    expect(engine.snap1d(104).snapped).toBe(true); // 4 <= 8
  });

  it('bypasses for a single call without disabling', () => {
    const engine = useSnapping({ targets, thresholdPx: 8 });
    const r = engine.snap1d(104, { bypass: true });
    expect(r.snapped).toBe(false);
    expect(r.value).toBe(104);
    // a normal call still snaps
    expect(engine.snap1d(104).snapped).toBe(true);
  });

  it('excludes a target id per call', () => {
    const withId: SnapTarget[] = [
      { axis: 'x', px: 100, value: 1, kind: 'edge', id: 'self' },
      { axis: 'x', px: 110, value: 1.1, kind: 'edge', id: 'other' },
    ];
    const engine = useSnapping({ targets: withId, thresholdPx: 20 });
    const r = engine.snap1d(102, { exclude: 'self' });
    expect(r.target?.id).toBe('other');
  });

  it('uses the consumer-supplied projection', () => {
    // values are domain units; project maps value -> px = value * 100.
    const domainTargets: SnapTarget[] = [{ axis: 'x', px: 100, value: 1, kind: 'grid' }];
    const engine = useSnapping({
      targets: domainTargets,
      thresholdPx: 8,
      project: value => value * 100,
    });
    // candidate value 1.05 -> px 105, 5px from target px 100 -> snaps to value 1.
    const r = engine.snap1d(1.05);
    expect(r.snapped).toBe(true);
    expect(r.value).toBe(1);
  });

  it('snap2d resolves each axis independently', () => {
    const xy: SnapTarget[] = [
      { axis: 'x', px: 100, value: 1, kind: 'grid' },
      { axis: 'y', px: 50, value: 9, kind: 'grid' },
    ];
    const engine = useSnapping({ targets: xy, thresholdPx: 8, axis: '2d' });
    const r = engine.snap2d({ x: 104, y: 500 });
    expect(r.snappedX).toBe(true);
    expect(r.point.x).toBe(1);
    expect(r.snappedY).toBe(false);
    expect(r.point.y).toBe(500);
    expect(engine.activeTargets.value).toHaveLength(1);
  });

  it('reset clears snapped/active state', () => {
    const engine = useSnapping({ targets, thresholdPx: 8 });
    engine.snap1d(104);
    expect(engine.isSnapped.value).toBe(true);
    engine.reset();
    expect(engine.isSnapped.value).toBe(false);
    expect(engine.activeTargets.value).toEqual([]);
  });

  it('keeps a locked target sticky across drifting calls (hysteresis)', () => {
    // two close targets; once snapped to the first, small drift toward the
    // second should not immediately flip while the first stays in the band.
    const close: SnapTarget[] = [
      { axis: 'x', px: 100, value: 1, kind: 'grid', id: 'a' },
      { axis: 'x', px: 108, value: 2, kind: 'grid', id: 'b' },
    ];
    const engine = useSnapping({ targets: close, thresholdPx: 6, hysteresisRatio: 1 });
    // 102 -> nearest 'a' (dist 2) vs 'b' (dist 6, out of base range) -> locks 'a'.
    expect(engine.snap1d(102).target?.id).toBe('a');
    // drift to 105: 'a' dist 5, 'b' dist 3. 'b' is closer but 'a' is still in the
    // widened release band -> hysteresis keeps 'a' (b not strictly closer? it is,
    // so it should steal only if strictly closer). Here b IS strictly closer.
    // Use a value where b is NOT strictly closer to prove stickiness:
    expect(engine.snap1d(104).target?.id).toBe('a'); // a dist 4, b dist 4 -> keep a
  });
});
