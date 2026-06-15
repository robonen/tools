import { describe, expect, it } from 'vitest';
import { clipIntersectsTime, clipsDuration, snapToFrame, timeToTimecode } from '../utils';
import type { TimelineClip } from '../utils';

describe('timeToTimecode', () => {
  it('formats seconds as SMPTE HH:MM:SS:FF at fps', () => {
    expect(timeToTimecode(0, 30)).toBe('00:00:00:00');
    expect(timeToTimecode(1, 30)).toBe('00:00:01:00');
    // 1.5s @ 30fps = 45 frames = 1s + 15f.
    expect(timeToTimecode(1.5, 30)).toBe('00:00:01:15');
    expect(timeToTimecode(61, 30)).toBe('00:01:01:00');
  });
});

describe('snapToFrame', () => {
  it('snaps a time to the nearest whole frame at fps', () => {
    // 0.02s @ 30fps -> 0.6 frames -> rounds to 1 frame -> 1/30s.
    expect(snapToFrame(0.02, 30)).toBeCloseTo(1 / 30, 6);
    // Exact frame stays put.
    expect(snapToFrame(2 / 30, 30)).toBeCloseTo(2 / 30, 6);
  });

  it('is a no-op for fps <= 0', () => {
    expect(snapToFrame(1.234, 0)).toBe(1.234);
  });
});

describe('clipsDuration', () => {
  it('derives the largest start+duration', () => {
    const clips: TimelineClip[] = [
      { id: 'a', trackId: 't', start: 0, duration: 2 },
      { id: 'b', trackId: 't', start: 5, duration: 3 }, // ends at 8
      { id: 'c', trackId: 't', start: 1, duration: 4 },
    ];
    expect(clipsDuration(clips)).toBe(8);
  });

  it('is 0 for an empty set', () => {
    expect(clipsDuration([])).toBe(0);
  });
});

describe('clipIntersectsTime', () => {
  const clip: TimelineClip = { id: 'a', trackId: 't', start: 4, duration: 2 }; // [4, 6]

  it('intersects an overlapping window', () => {
    expect(clipIntersectsTime(clip, 5, 7)).toBe(true);
    expect(clipIntersectsTime(clip, 0, 4.5)).toBe(true);
  });

  it('does not intersect a disjoint window', () => {
    expect(clipIntersectsTime(clip, 0, 3)).toBe(false);
    expect(clipIntersectsTime(clip, 7, 9)).toBe(false);
  });

  it('normalizes a reversed window (to < from)', () => {
    expect(clipIntersectsTime(clip, 7, 5)).toBe(true);
  });
});
