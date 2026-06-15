import type { Point } from '../../internal/utils/geometry';

/** The amplitude range the supplied `peaks` are normalized to. */
export type WaveformPeaksRange = '0..1' | '-1..1';

/** Render strategy for the waveform body. */
export type WaveformMode = 'bars' | 'path';

/** A single audio region (selection) owned by the root. */
export interface WaveformRegionData {
  /** Stable identity used for `v-for` keys and update/remove targeting. */
  id: string;
  /** Region start, in seconds. */
  start: number;
  /** Region end, in seconds. */
  end: number;
  /** Optional human-readable label (folded into the group's `aria-label`). */
  label?: string;
  /** Optional CSS color the consumer may bind to the region surface. */
  color?: string;
}

/**
 * Geometry of one rendered bar: its `x` offset (px, left edge), drawn `width`
 * (px), and `height` as a `0..1` fraction of the available vertical space (the
 * consumer maps this onto its own pixel height).
 */
export interface WaveformBar {
  /** Left edge of the bar, in pixels from the start of the body. */
  x: number;
  /** Drawn width of the bar, in pixels (`barWidth`). */
  width: number;
  /** Peak magnitude for this bar as a `0..1` fraction of full height. */
  height: number;
}

/**
 * Number of bars that fit across `width` px given `barWidth` + `barGap`.
 *
 * The trailing bar needs no gap, so the count is
 * `floor((width + barGap) / (barWidth + barGap))`. Guards every degenerate
 * input (non-positive width, non-positive pitch) by returning `0` — callers
 * then render nothing rather than dividing by zero.
 */
export function countBars(width: number, barWidth: number, barGap: number): number {
  if (width <= 0) return 0;
  const w = barWidth > 0 ? barWidth : 1;
  const gap = barGap > 0 ? barGap : 0;
  const pitch = w + gap;
  if (pitch <= 0) return 0;
  const n = Math.floor((width + gap) / pitch);
  return n > 0 ? n : 0;
}

/**
 * Read amplitude `i` of `peaks` as a non-negative `0..1` magnitude.
 *
 * `peaksRange` selects the source convention: `'-1..1'` (the default — signed
 * PCM-style samples) takes the absolute value; `'0..1'` (pre-rectified
 * magnitudes) is passed through. The result is always clamped to `0..1`.
 */
function magnitudeAt(peaks: ArrayLike<number>, i: number, signed: boolean): number {
  const v = peaks[i] ?? 0;
  const m = signed ? (v < 0 ? -v : v) : v;
  if (m <= 0) return 0;
  return m > 1 ? 1 : m;
}

/**
 * Resample `peaks` (any length) into `bucketCount` peak magnitudes by RATIO.
 *
 * The window `[sampleStart, sampleEnd)` of the source is divided into
 * `bucketCount` equal slices; each bucket takes the **max** magnitude of the
 * samples that land in its slice (max, not mean — peak meters must not wash out
 * transients). `peaks.length` is decoupled from the bar count: the slice width
 * is `(sampleEnd - sampleStart) / bucketCount`, never assumed to be 1.
 *
 * Empty input, a zero-or-negative bucket count, or a degenerate window all
 * yield an empty array (no divide-by-zero).
 *
 * @param peaks Source per-sample amplitudes.
 * @param bucketCount How many output buckets (bars) to produce.
 * @param signed Whether `peaks` are signed (`'-1..1'`) and must be rectified.
 * @param sampleStart First source index of the visible window (inclusive). @default 0
 * @param sampleEnd Last source index of the visible window (exclusive). @default peaks.length
 */
export function resamplePeaks(
  peaks: ArrayLike<number>,
  bucketCount: number,
  signed: boolean,
  sampleStart = 0,
  sampleEnd = peaks.length,
): number[] {
  const len = peaks.length;
  if (len === 0 || bucketCount <= 0) return [];

  const lo = sampleStart < 0 ? 0 : sampleStart > len ? len : sampleStart;
  const hi = sampleEnd < lo ? lo : sampleEnd > len ? len : sampleEnd;
  const span = hi - lo;
  // Degenerate window → flat (zero-height) buckets rather than NaN.
  if (span <= 0) {
    const flat: number[] = [];
    for (let b = 0; b < bucketCount; b++) flat.push(0);
    return flat;
  }

  const out: number[] = [];
  const slice = span / bucketCount;
  for (let b = 0; b < bucketCount; b++) {
    let from = Math.floor(lo + b * slice);
    let to = Math.floor(lo + (b + 1) * slice);
    if (to <= from) to = from + 1; // ensure each bucket samples at least once
    if (from < lo) from = lo;
    if (to > hi) to = hi;
    let peak = 0;
    for (let i = from; i < to; i++) {
      const m = magnitudeAt(peaks, i, signed);
      if (m > peak) peak = m;
    }
    out.push(peak);
  }
  return out;
}

/**
 * Build the full bar geometry for a body of `width` px.
 *
 * Bars are centered as a group: the leftover after `count` bars + gaps is split
 * so the row sits flush-centered. Each entry carries its pixel `x`, its drawn
 * `width` (px), and its `height` as a `0..1` fraction.
 */
export function buildBars(
  peaks: ArrayLike<number>,
  width: number,
  barWidth: number,
  barGap: number,
  signed: boolean,
  sampleStart = 0,
  sampleEnd = peaks.length,
): WaveformBar[] {
  const count = countBars(width, barWidth, barGap);
  if (count === 0) return [];
  const w = barWidth > 0 ? barWidth : 1;
  const gap = barGap > 0 ? barGap : 0;
  const pitch = w + gap;
  const used = count * pitch - gap;
  const leftPad = (width - used) / 2;
  const heights = resamplePeaks(peaks, count, signed, sampleStart, sampleEnd);
  const bars: WaveformBar[] = [];
  for (let i = 0; i < count; i++) {
    bars.push({ x: leftPad + i * pitch, width: w, height: heights[i] ?? 0 });
  }
  return bars;
}

/**
 * Build the polyline points for path mode: `samples + 1` points across the body
 * width, y mapped so `0` magnitude sits on the vertical center and full
 * magnitude reaches top/bottom. Returns the upper silhouette (consumers mirror
 * it for a filled shape, or stroke it directly).
 *
 * `height` is the body's pixel height; `samples` the resample resolution.
 */
export function buildPathPoints(
  peaks: ArrayLike<number>,
  width: number,
  height: number,
  samples: number,
  signed: boolean,
  sampleStart = 0,
  sampleEnd = peaks.length,
): Point[] {
  if (width <= 0 || height <= 0 || samples <= 0) return [];
  const mags = resamplePeaks(peaks, samples, signed, sampleStart, sampleEnd);
  const mid = height / 2;
  const points: Point[] = [];
  const step = samples > 1 ? width / (samples - 1) : 0;
  for (let i = 0; i < samples; i++) {
    const m = mags[i] ?? 0;
    points.push({ x: i * step, y: mid - m * mid });
  }
  return points;
}
