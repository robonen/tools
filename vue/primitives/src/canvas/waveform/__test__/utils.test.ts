import { describe, expect, it } from 'vitest';
import { buildBars, buildPathPoints, countBars, resamplePeaks } from '../utils';

describe('countBars', () => {
  it('counts bars by pitch (barWidth + barGap), no trailing gap', () => {
    // pitch = 2 + 1 = 3; (300 + 1) / 3 = 100.33 → 100
    expect(countBars(300, 2, 1)).toBe(100);
    // pitch = 4 + 2 = 6; (120 + 2) / 6 = 20.33 → 20
    expect(countBars(120, 4, 2)).toBe(20);
    // no gap: pitch = barWidth
    expect(countBars(100, 2, 0)).toBe(50);
  });

  it('returns 0 for degenerate widths (no divide-by-zero)', () => {
    expect(countBars(0, 2, 1)).toBe(0);
    expect(countBars(-10, 2, 1)).toBe(0);
  });

  it('treats non-positive barWidth as 1px and non-positive gap as 0', () => {
    expect(countBars(10, 0, 0)).toBe(10);
    expect(countBars(10, -5, -5)).toBe(10);
  });
});

describe('resamplePeaks', () => {
  it('produces exactly bucketCount values regardless of peaks length', () => {
    expect(resamplePeaks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4, false)).toHaveLength(4);
    expect(resamplePeaks([0.5], 8, false)).toHaveLength(8);
    expect(resamplePeaks(Array.from({ length: 1000 }, () => 0.3), 37, false)).toHaveLength(37);
  });

  it('takes the MAX magnitude within each bucket slice', () => {
    // 8 samples → 2 buckets → slice [0,4) and [4,8)
    const peaks = [0.1, 0.9, 0.2, 0.3, 0.4, 0.5, 0.1, 0.2];
    expect(resamplePeaks(peaks, 2, false)).toEqual([0.9, 0.5]);
  });

  it('rectifies signed peaks via absolute value', () => {
    const peaks = [-0.8, 0.2, -0.1, 0.3];
    // signed → |−0.8| = 0.8 max in first slice
    expect(resamplePeaks(peaks, 2, true)).toEqual([0.8, 0.3]);
  });

  it('passes through 0..1 peaks unchanged (clamped to 1)', () => {
    expect(resamplePeaks([0.4, 1.5, 0.2, 0.6], 2, false)).toEqual([1, 0.6]);
  });

  it('resamples a window slice by ratio', () => {
    const peaks = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    // window [4, 8) → 2 buckets → [0.5, 0.6] and [0.7, 0.8]
    expect(resamplePeaks(peaks, 2, false, 4, 8)).toEqual([0.6, 0.8]);
  });

  it('returns [] for empty peaks or non-positive bucket count', () => {
    expect(resamplePeaks([], 4, false)).toEqual([]);
    expect(resamplePeaks([1, 2, 3], 0, false)).toEqual([]);
  });

  it('yields flat zero buckets for a degenerate window (no NaN)', () => {
    const out = resamplePeaks([1, 2, 3], 3, false, 2, 2);
    expect(out).toEqual([0, 0, 0]);
    expect(out.some(Number.isNaN)).toBe(false);
  });

  it('upsamples (more buckets than samples) without NaN', () => {
    const out = resamplePeaks([0.2, 0.8], 6, false);
    expect(out).toHaveLength(6);
    expect(out.some(Number.isNaN)).toBe(false);
    // every bucket samples at least one source value
    expect(out.every(v => v >= 0)).toBe(true);
  });
});

describe('buildBars', () => {
  it('returns one bar per fitted bucket with correct width', () => {
    const peaks = Array.from({ length: 50 }, (_, i) => i / 50);
    const bars = buildBars(peaks, 300, 2, 1, false);
    expect(bars).toHaveLength(100); // countBars(300,2,1)
    expect(bars.every(b => b.width === 2)).toBe(true);
  });

  it('respects an arbitrary peaks length (more or fewer than bars)', () => {
    expect(buildBars([0.5], 100, 2, 0, false)).toHaveLength(50);
    expect(buildBars(Array.from({ length: 9999 }, () => 0.5), 100, 2, 0, false)).toHaveLength(50);
  });

  it('places bars on a pitch and centers leftover space', () => {
    // width 10, barWidth 2, gap 0 → 5 bars at x = 0,2,4,6,8 (no leftover)
    const bars = buildBars([1, 1, 1, 1, 1], 10, 2, 0, false);
    expect(bars.map(b => b.x)).toEqual([0, 2, 4, 6, 8]);
  });

  it('returns [] when width is 0 (renders nothing)', () => {
    expect(buildBars([0.5, 0.6], 0, 2, 1, false)).toEqual([]);
  });

  it('heights are 0..1 fractions', () => {
    const bars = buildBars([0.25, 1, 0.5], 6, 2, 0, false);
    expect(bars.every(b => b.height >= 0 && b.height <= 1)).toBe(true);
  });
});

describe('buildPathPoints', () => {
  it('returns `samples` points spanning the width', () => {
    const pts = buildPathPoints([0, 0.5, 1, 0.5], 100, 40, 4, false);
    expect(pts).toHaveLength(4);
    expect(pts[0]!.x).toBe(0);
    expect(pts[3]!.x).toBeCloseTo(100);
  });

  it('maps magnitude onto the vertical center', () => {
    // height 40 → mid 20; magnitude 1 → y = 0 (top), magnitude 0 → y = 20 (mid)
    const pts = buildPathPoints([1, 0], 100, 40, 2, false);
    expect(pts[0]!.y).toBeCloseTo(0);
    expect(pts[1]!.y).toBeCloseTo(20);
  });

  it('returns [] for degenerate geometry', () => {
    expect(buildPathPoints([0.5], 0, 40, 8, false)).toEqual([]);
    expect(buildPathPoints([0.5], 100, 0, 8, false)).toEqual([]);
    expect(buildPathPoints([0.5], 100, 40, 0, false)).toEqual([]);
  });
});
