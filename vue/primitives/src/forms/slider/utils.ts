/**
 * Returns the number of decimal digits in a numeric `step`.
 *
 * Used by {@link roundToStep} to compensate floating-point drift without
 * allocating strings on every invocation (the cost is paid once per `step`
 * change and cached by the caller).
 */
export function getStepDecimals(step: number): number {
  if (!Number.isFinite(step)) return 0;
  const str = String(step);
  const dot = str.indexOf('.');
  if (dot === -1) return 0;
  return str.length - dot - 1;
}

/**
 * Snap `value` to the nearest multiple of `step` anchored at `min`.
 *
 * `decimals` must be pre-computed by the caller via {@link getStepDecimals}
 * and cached per-`step` — this function is on the pointermove hot path.
 */
export function roundToStep(value: number, step: number, min: number, decimals: number): number {
  const nearest = Math.round((value - min) / step) * step + min;
  return decimals > 0 ? Number(nearest.toFixed(decimals)) : nearest;
}

/**
 * Linear projection of `value` from the input domain onto the output range.
 *
 * Plain (non-curried) form — no per-call closure allocation.
 */
export function scaleLinear(value: number, d0: number, d1: number, r0: number, r1: number): number {
  if (d0 === d1 || r0 === r1) return r0;
  return r0 + ((r1 - r0) / (d1 - d0)) * (value - d0);
}

/**
 * Verify that adjacent values in an already-sorted `values` array differ by
 * at least `minStepsBetween * step`.
 *
 * The caller is expected to maintain the invariant that `values` is sorted
 * ascending (the slider Root guarantees this by construction).
 */
export function hasMinStepsBetweenSortedValues(values: number[], minStepsBetween: number, step: number): boolean {
  if (minStepsBetween <= 0 || values.length < 2) return true;
  const minGap = minStepsBetween * step;
  for (let i = 1; i < values.length; i++) {
    if (values[i]! - values[i - 1]! < minGap) return false;
  }
  return true;
}

/**
 * Index of the value in `values` closest to `nextValue`.
 *
 * Single-pass — no intermediate distance array.
 */
export function getClosestValueIndex(values: number[], nextValue: number): number {
  if (values.length <= 1) return 0;
  let bestIdx = 0;
  let bestDist = Math.abs(values[0]! - nextValue);
  for (let i = 1; i < values.length; i++) {
    const d = Math.abs(values[i]! - nextValue);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Offset (in pixels) that keeps a thumb of `size` px centred on its track
 * position fully inside the track at the extremes. At 0 % the thumb is nudged
 * inward by half its size, at 100 % outward by the same amount, scaling
 * linearly in between. `direction` is `1` when the start edge grows from the
 * low end and `-1` when inverted, so the sign matches the positioning edge.
 *
 * Returns `0` for the `'overflow'` alignment (caller short-circuits) — used only
 * for `'contain'`.
 */
export function getThumbInBoundsOffset(size: number, percent: number, direction: number): number {
  const halfSize = size / 2;
  const offset = scaleLinear(percent, 0, 50, 0, halfSize);
  return (halfSize - offset * direction) * direction;
}

/**
 * Default accessible label for a thumb when the consumer does not supply an
 * explicit `aria-label`. Single-thumb sliders return `undefined` (the value is
 * self-describing via `aria-valuenow`); two thumbs become `Minimum` / `Maximum`;
 * three or more become `Value N of M`.
 */
export function getDefaultThumbLabel(index: number, total: number): string | undefined {
  if (total > 2) return `Value ${index + 1} of ${total}`;
  if (total === 2) return index === 0 ? 'Minimum' : 'Maximum';
  return undefined;
}
