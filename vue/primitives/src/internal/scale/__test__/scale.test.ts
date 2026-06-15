import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import {
  formatClock,
  formatFrames,
  framesToTimecode,
  getStepDecimals,
  niceNum,
  niceTicks,
  roundToStep,
  scaleLinear,
  timeTicks,
  useScale,
} from '..';

describe('math', () => {
  it('scaleLinear projects linearly', () => {
    expect(scaleLinear(50, 0, 100, 0, 1000)).toBe(500);
    expect(scaleLinear(0, 0, 100, 0, 1000)).toBe(0);
    expect(scaleLinear(100, 0, 100, 0, 1000)).toBe(1000);
  });

  it('scaleLinear returns r0 for degenerate domain/range', () => {
    expect(scaleLinear(5, 10, 10, 0, 1000)).toBe(0);
    expect(scaleLinear(5, 0, 100, 7, 7)).toBe(7);
  });

  it('roundToStep cleans float drift', () => {
    expect(roundToStep(1.3, 0.1, 0, getStepDecimals(0.1))).toBe(1.3);
    expect(roundToStep(1.30000001, 0.1, 0, getStepDecimals(0.1))).toBe(1.3);
    expect(roundToStep(0.1 + 0.2, 0.1, 0, getStepDecimals(0.1))).toBe(0.3);
    expect(getStepDecimals(0.001)).toBe(3);
    expect(getStepDecimals(5)).toBe(0);
  });
});

describe('niceNum', () => {
  it('rounds to nice 1/2/5/10 multiples', () => {
    expect(niceNum(0.66, true)).toBe(0.5);
    expect(niceNum(1.3, true)).toBe(1);
    expect(niceNum(4, true)).toBe(5);
    expect(niceNum(8, true)).toBe(10);
    expect(niceNum(120, true)).toBe(100);
  });

  it('ceils when round is false', () => {
    expect(niceNum(1.1, false)).toBe(2);
    expect(niceNum(3, false)).toBe(5);
    expect(niceNum(6, false)).toBe(10);
  });

  it('returns 0 for non-positive input', () => {
    expect(niceNum(0, true)).toBe(0);
    expect(niceNum(-5, true)).toBe(0);
  });
});

describe('niceTicks', () => {
  it('anchors ticks to integer-aligned step (no pan-jitter)', () => {
    const ticks = niceTicks({ domain: [10.3, 20.7], range: [0, 500] });
    const values = ticks.map(t => t.value);
    // Step resolves to 1 -> all ticks are integers, NOT 10.3, 11.3, ...
    for (const v of values) {
      expect(Number.isInteger(v)).toBe(true);
    }
    // 11..20 must all be present.
    for (let v = 11; v <= 20; v++) {
      expect(values).toContain(v);
    }
    // No fractional anchor leakage.
    expect(values).not.toContain(10.3);
    expect(values).not.toContain(11.3);
  });

  it('caps candidate count at maxTicks (no OOM on huge axes)', () => {
    // 10h frame-rate axis at 1px/frame would be ~36M candidates without a cap.
    const ticks = niceTicks({ domain: [0, 36_000_000], range: [0, 36_000_000], maxTicks: 100 });
    expect(ticks.length).toBeLessThanOrEqual(101);
  });

  it('returns [] for zero-span domain', () => {
    expect(niceTicks({ domain: [5, 5], range: [0, 100] })).toEqual([]);
  });

  it('honors a custom format on major ticks', () => {
    const ticks = niceTicks({
      domain: [0, 10],
      range: [0, 200],
      format: v => `#${v}`,
    });
    const major = ticks.find(t => t.major);
    expect(major?.label.startsWith('#')).toBe(true);
  });
});

describe('timeTicks', () => {
  it('uses the human time ladder and marks minute boundaries major', () => {
    // Range wide enough that the chosen rung is sub-minute (step 30s),
    // so a tick lands exactly on the 60s minute boundary.
    const ticks = timeTicks({ domain: [0, 600], range: [0, 2000] });
    expect(ticks.length).toBeGreaterThan(0);
    const minuteTick = ticks.find(t => t.value === 60);
    expect(minuteTick?.major).toBe(true);
    expect(minuteTick?.label).toBe(formatClock(60));
    // A 30s sub-minute tick is minor.
    expect(ticks.find(t => t.value === 30)?.major).toBe(false);
  });

  it('only uses ladder-rung steps', () => {
    const ticks = timeTicks({ domain: [0, 3600], range: [0, 1000] });
    // Consecutive tick spacing must be a single ladder rung.
    const diffs = new Set(ticks.slice(1).map((t, i) => t.value - ticks[i]!.value));
    expect(diffs.size).toBe(1);
  });
});

describe('timecode', () => {
  it('matches known drop-frame vectors', () => {
    expect(framesToTimecode(17982, 29.97, true)).toBe('00:10:00;00');
    expect(framesToTimecode(1800, 29.97, true)).toBe('00:01:00;02');
  });

  it('matches non-drop vectors', () => {
    expect(framesToTimecode(0, 30)).toBe('00:00:00:00');
    expect(framesToTimecode(30, 30)).toBe('00:00:01:00');
  });

  it('handles 59.94 drop-frame', () => {
    expect(framesToTimecode(35964, 59.94, true)).toBe('00:10:00;00');
    expect(framesToTimecode(3600, 59.94, true)).toBe('00:01:00;04');
  });

  it('formatClock switches on magnitude', () => {
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3665)).toBe('1:01:05');
  });

  it('formatFrames renders the frame number', () => {
    expect(formatFrames(1234)).toBe('1,234');
  });
});

describe('useScale flip composition', () => {
  // domain [0,100] -> range [0,1000]. Expected px for value 0 across all 8 combos.
  const cases: Array<[
    'horizontal' | 'vertical',
    boolean,
    boolean,
    number,
  ]> = [
    ['horizontal', false, false, 0],
    ['horizontal', false, true, 1000],
    ['horizontal', true, false, 1000],
    ['horizontal', true, true, 0],
    ['vertical', false, false, 1000],
    ['vertical', false, true, 1000],
    ['vertical', true, false, 0],
    ['vertical', true, true, 0],
  ];

  for (const [orientation, inverted, rtl, expectedPx] of cases) {
    it(`orientation=${orientation} inverted=${inverted} rtl=${rtl} -> px(0)=${expectedPx}`, () => {
      const { scale } = useScale({
        domain: [0, 100],
        range: [0, 1000],
        orientation,
        inverted,
        rtl,
      });
      expect(scale(0)).toBe(expectedPx);
      // value 100 is always the opposite endpoint.
      expect(scale(100)).toBe(expectedPx === 0 ? 1000 : 0);
    });
  }
});

describe('useScale behaviour', () => {
  it('scale and invert round-trip', () => {
    const { scale, invert } = useScale({ domain: [0, 100], range: [0, 1000] });
    expect(scale(25)).toBe(250);
    expect(invert(250)).toBe(25);
  });

  it('reacts to reactive domain changes (stable closure)', () => {
    const domain = ref<readonly [number, number]>([0, 100]);
    const { scale } = useScale({ domain, range: [0, 1000] });
    expect(scale(50)).toBe(500);
    domain.value = [0, 200];
    expect(scale(50)).toBe(250);
  });

  it('clamps when clamp option is true', () => {
    const { scale, invert } = useScale({ domain: [0, 100], range: [0, 1000], clamp: true });
    expect(scale(200)).toBe(1000);
    expect(scale(-50)).toBe(0);
    expect(invert(5000)).toBe(100);
    expect(invert(-100)).toBe(0);
  });

  it('roundValue snaps to step then clamps', () => {
    const { roundValue } = useScale({ domain: [0, 100], range: [0, 1000], step: 5 });
    expect(roundValue(12)).toBe(10);
    expect(roundValue(13)).toBe(15);
    expect(roundValue(120)).toBe(100);
  });

  it('roundValue is a no-op snap when step is undefined (clamp only)', () => {
    const { roundValue } = useScale({ domain: [0, 100], range: [0, 1000] });
    expect(roundValue(12.345)).toBe(12.345);
    expect(roundValue(200)).toBe(100);
  });

  it('clampValue honors explicit min/max', () => {
    const { clampValue } = useScale({ domain: [0, 100], range: [0, 1000], min: 10, max: 90 });
    expect(clampValue(5)).toBe(10);
    expect(clampValue(95)).toBe(90);
    expect(clampValue(50)).toBe(50);
  });

  it('pxPerUnit guards divide-by-zero', () => {
    const { pxPerUnit } = useScale({ domain: [0, 100], range: [0, 1000] });
    expect(pxPerUnit.value).toBe(10);
    const { pxPerUnit: zero } = useScale({ domain: [5, 5], range: [0, 1000] });
    expect(zero.value).toBe(0);
  });

  it('ticks dispatch on tickKind and split into major/minor', () => {
    const { ticks, majorTicks, minorTicks } = useScale({
      domain: [0, 100],
      range: [0, 1000],
      tickKind: 'nice',
    });
    expect(ticks.value.length).toBeGreaterThan(0);
    expect(majorTicks.value.length + minorTicks.value.length).toBe(ticks.value.length);
    expect(majorTicks.value.every(t => t.major)).toBe(true);
    expect(minorTicks.value.every(t => !t.major)).toBe(true);
  });

  it('ticks are [] for tickKind none or zero range span', () => {
    const { ticks: none } = useScale({ domain: [0, 100], range: [0, 1000], tickKind: 'none' });
    expect(none.value).toEqual([]);
    const { ticks: flat } = useScale({ domain: [0, 100], range: [50, 50], tickKind: 'nice' });
    expect(flat.value).toEqual([]);
  });
});
