import { solveBezierX } from '../../internal/spline';
import { framesToSeconds, secondsToFrames } from '../../internal/scale';
import { DEFAULT_KEYFRAME_EASING } from './context';
import type { KeyframeTrackKeyframeData } from './context';

/**
 * Sort keyframes ascending by `time`, returning a NEW array (never mutating the
 * input). Stable for equal times (a tie breaks on `id`) so the order is
 * deterministic across reconciles and neighbour-clamping stays predictable.
 */
export function sortKeyframes(keyframes: readonly KeyframeTrackKeyframeData[]): KeyframeTrackKeyframeData[] {
  return keyframes
    .slice()
    .sort((a, b) => (a.time - b.time) || a.id.localeCompare(b.id));
}

/**
 * Linear interpolate between `a` and `b` by `t ∈ [0, 1]`.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Sample the animated value at an arbitrary `time` (seconds) over a SORTED
 * keyframe list.
 *
 * Finds the bracketing pair `[k, k+1]`, computes the normalized progress along
 * the segment, applies the starting keyframe's cubic-bezier easing (via the
 * spline `solveBezierX`, defaulting to {@link DEFAULT_KEYFRAME_EASING} — a linear
 * ramp), and lerps the value. The result is CONSTANT outside the keyframe range
 * (held at the first / last keyframe's value) and for the 0- and 1-keyframe
 * degenerate cases.
 *
 * `valueRange` is accepted for parity with the projection model but does not
 * affect the sampled value (values are sampled in their own space, never
 * normalized) — it is reserved so callers can pass it without a second overload.
 *
 * @param keyframes Keyframes sorted ascending by `time`.
 * @param time Time to sample, in seconds.
 * @param valueRange Optional value domain (unused by the maths; see above).
 */
export function sampleKeyframes(
  keyframes: readonly KeyframeTrackKeyframeData[],
  time: number,
  _valueRange?: readonly [number, number],
): number {
  const n = keyframes.length;
  if (n === 0) return 0;
  const first = keyframes[0]!;
  if (n === 1) return first.value;
  const last = keyframes[n - 1]!;

  // Held constant outside the keyframe range.
  if (time <= first.time) return first.value;
  if (time >= last.time) return last.value;

  // Binary search for the segment [lo, lo+1] containing `time`.
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (keyframes[mid]!.time <= time) lo = mid;
    else hi = mid;
  }

  const a = keyframes[lo]!;
  const b = keyframes[lo + 1]!;
  const span = b.time - a.time;
  if (span <= 0) return a.value;

  const progress = (time - a.time) / span;
  const easing = a.easing ?? DEFAULT_KEYFRAME_EASING;
  // Easing maps normalized progress (x) to eased progress (y) in [0, 1].
  const eased = solveBezierX(easing[0], easing[1], easing[2], easing[3], progress);
  return lerp(a.value, b.value, eased);
}

/**
 * Clamp a candidate `time` for the keyframe at `index` so it stays ordered
 * relative to its neighbours by at least `minTimeBetween` seconds (unless
 * `allowOverlap`), and never goes below `0`. `keyframes` MUST be sorted by time.
 *
 * @param keyframes Keyframes sorted ascending by `time`.
 * @param index Index of the keyframe being moved.
 * @param time Candidate time (seconds).
 * @param options Neighbour-clamp configuration.
 */
export function clampKeyframeTime(
  keyframes: readonly KeyframeTrackKeyframeData[],
  index: number,
  time: number,
  options: { allowOverlap: boolean; minTimeBetween: number; duration?: number },
): number {
  const { allowOverlap, minTimeBetween, duration } = options;
  let v = Math.max(0, time);
  if (duration !== undefined && duration > 0) v = Math.min(v, duration);

  if (!allowOverlap) {
    const prev = keyframes[index - 1];
    const next = keyframes[index + 1];
    if (prev !== undefined) v = Math.max(v, prev.time + minTimeBetween);
    if (next !== undefined) v = Math.min(v, next.time - minTimeBetween);
  }
  return v;
}

/**
 * Snap a `time` (seconds) to the nearest whole frame at `fps`. The default
 * frame-grid quantizer used as the keyboard nudge granularity / snap fallback.
 */
export function snapTimeToFrame(time: number, fps: number): number {
  if (fps <= 0) return time;
  return framesToSeconds(secondsToFrames(time, fps), fps);
}

/**
 * Round to `decimals` places, trimming float noise (no trailing-zero padding).
 */
function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * The default `aria-valuetext` value-token for a keyframe: the animated property
 * (when present) followed by the value, e.g. `"opacity 0.5"` or just `"0.5"`.
 * The time is announced separately by the caller (a slider's `aria-valuetext`
 * leads with the formatted time).
 */
export function defaultKeyframeValueText(value: number, property?: string, decimals = 3): string {
  const v = round(value, decimals);
  return property ? `${property} ${v}` : `${v}`;
}
