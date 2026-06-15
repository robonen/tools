import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYFRAME_EASING } from '../context';
import type { KeyframeTrackKeyframeData } from '../context';
import {
  clampKeyframeTime,
  defaultKeyframeValueText,
  sampleKeyframes,
  snapTimeToFrame,
  sortKeyframes,
} from '../utils';

function kf(id: string, time: number, value: number, easing?: [number, number, number, number]): KeyframeTrackKeyframeData {
  return easing ? { id, time, value, easing } : { id, time, value };
}

describe('sortKeyframes', () => {
  it('sorts ascending by time without mutating the input', () => {
    const input = [kf('b', 2, 1), kf('a', 0, 0), kf('c', 1, 0.5)];
    const sorted = sortKeyframes(input);
    expect(sorted.map(k => k.id)).toEqual(['a', 'c', 'b']);
    // input untouched
    expect(input.map(k => k.id)).toEqual(['b', 'a', 'c']);
  });

  it('breaks ties deterministically on id', () => {
    const sorted = sortKeyframes([kf('z', 1, 0), kf('a', 1, 1)]);
    expect(sorted.map(k => k.id)).toEqual(['a', 'z']);
  });
});

describe('sampleKeyframes', () => {
  it('returns the single value for 0 / 1 keyframes', () => {
    expect(sampleKeyframes([], 5)).toBe(0);
    expect(sampleKeyframes([kf('a', 2, 0.7)], 100)).toBe(0.7);
    expect(sampleKeyframes([kf('a', 2, 0.7)], -100)).toBe(0.7);
  });

  it('holds constant outside the keyframe range', () => {
    const ks = [kf('a', 1, 0), kf('b', 3, 1)];
    expect(sampleKeyframes(ks, 0)).toBe(0);
    expect(sampleKeyframes(ks, 1)).toBe(0);
    expect(sampleKeyframes(ks, 3)).toBe(1);
    expect(sampleKeyframes(ks, 10)).toBe(1);
  });

  it('linear easing midpoint ≈ the average of the two values', () => {
    // DEFAULT_KEYFRAME_EASING is a linear ramp.
    const ks = [kf('a', 0, 0, [...DEFAULT_KEYFRAME_EASING] as [number, number, number, number]), kf('b', 2, 1)];
    expect(sampleKeyframes(ks, 1)).toBeCloseTo(0.5, 6);
    expect(sampleKeyframes(ks, 0.5)).toBeCloseTo(0.25, 6);
  });

  it('an ease curve is off-center at the midpoint (vs linear)', () => {
    // ease-in: cubic-bezier(0.42, 0, 1, 1) starts slow → midpoint below 0.5.
    const ks = [kf('a', 0, 0, [0.42, 0, 1, 1]), kf('b', 2, 1)];
    const mid = sampleKeyframes(ks, 1);
    expect(mid).toBeLessThan(0.5);
    expect(mid).toBeGreaterThan(0);
  });

  it('ease-out is above 0.5 at the midpoint', () => {
    // ease-out: cubic-bezier(0, 0, 0.58, 1) ends slow → midpoint above 0.5.
    const ks = [kf('a', 0, 0, [0, 0, 0.58, 1]), kf('b', 2, 1)];
    expect(sampleKeyframes(ks, 1)).toBeGreaterThan(0.5);
  });
});

describe('clampKeyframeTime', () => {
  const ks = [kf('a', 0, 0), kf('b', 1, 0), kf('c', 2, 0)];

  it('clamps to >= 0 and <= duration', () => {
    expect(clampKeyframeTime(ks, 1, -5, { allowOverlap: true, minTimeBetween: 0 })).toBe(0);
    expect(clampKeyframeTime(ks, 1, 99, { allowOverlap: true, minTimeBetween: 0, duration: 2 })).toBe(2);
  });

  it('neighbour-clamps with minTimeBetween when overlap is disallowed', () => {
    // Moving b (index 1) far right stops minTimeBetween before c (time 2).
    expect(clampKeyframeTime(ks, 1, 5, { allowOverlap: false, minTimeBetween: 0.25 })).toBe(1.75);
    // Moving b far left stops minTimeBetween after a (time 0).
    expect(clampKeyframeTime(ks, 1, -5, { allowOverlap: false, minTimeBetween: 0.25 })).toBe(0.25);
  });

  it('allows crossing neighbours when overlap is enabled', () => {
    expect(clampKeyframeTime(ks, 1, 1.9, { allowOverlap: true, minTimeBetween: 0.25 })).toBe(1.9);
  });
});

describe('snapTimeToFrame', () => {
  it('quantizes to whole frames at fps', () => {
    expect(snapTimeToFrame(0.51, 30)).toBeCloseTo(15 / 30, 6);
    expect(snapTimeToFrame(0.49, 30)).toBeCloseTo(15 / 30, 6);
  });

  it('passes through when fps <= 0', () => {
    expect(snapTimeToFrame(1.234, 0)).toBe(1.234);
  });
});

describe('defaultKeyframeValueText', () => {
  it('includes the property when present', () => {
    expect(defaultKeyframeValueText(0.5, 'opacity')).toBe('opacity 0.5');
  });

  it('omits the property when absent', () => {
    expect(defaultKeyframeValueText(0.5)).toBe('0.5');
  });
});
