import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export interface UseRoundOptions {
  /**
   * Number of decimal places to round to.
   *
   * `0` (default) reproduces `Math.round` exactly. Positive values round to
   * fractional digits (e.g. `2` -> `1.23`), negative values round to the left
   * of the decimal point (e.g. `-1` -> nearest ten).
   *
   * @default 0
   */
  digits?: MaybeRefOrGetter<number>;
}

/**
 * @name useRound
 * @category Math
 * @description Reactive `Math.round` with optional decimal-place precision
 *
 * @param {MaybeRefOrGetter<number>} value The value to round
 * @param {UseRoundOptions} [options] Rounding options
 * @returns {ComputedRef<number>} A computed ref of the rounded value
 *
 * @example
 * const value = ref(0.6);
 * const rounded = useRound(value); // 1
 *
 * @example
 * const value = ref(1.2345);
 * const rounded = useRound(value, { digits: 2 }); // 1.23
 *
 * @example
 * const value = ref(0.5);
 * const rounded = useRound(() => value.value); // 1
 *
 * @since 0.0.15
 */
export function useRound(value: MaybeRefOrGetter<number>, options: UseRoundOptions = {}): ComputedRef<number> {
  const { digits = 0 } = options;

  return computed<number>(() => {
    const v = toValue(value);
    const d = toValue(digits);

    // Fast path: identical to Math.round, avoids any precision math.
    if (!d)
      return Math.round(v);

    // Non-finite inputs (NaN/Infinity) round to themselves; bail early so the
    // factor multiplication below does not turn Infinity into NaN.
    if (!Number.isFinite(v))
      return v;

    // Scale into integer space, round, then scale back. Using `Number(... )`
    // through exponential notation sidesteps the classic float artifacts of
    // `Math.round(v * factor) / factor` (e.g. 1.005 -> 1.00).
    const sign = v < 0 ? '-' : '';
    const abs = Math.abs(v);

    const shifted = Number(`${abs}e${d}`);
    const rounded = Math.round(shifted);

    return Number(`${sign}${rounded}e${-d}`);
  });
}
