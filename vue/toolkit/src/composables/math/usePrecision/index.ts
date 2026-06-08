import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type UsePrecisionMath
  = 'floor' | 'ceil' | 'round';

export interface UsePrecisionOptions {
  /**
   * The `Math` method used to reduce the number to the requested precision.
   *
   * @default 'round'
   */
  math?: UsePrecisionMath;
}

export type UsePrecisionReturn
  = ComputedRef<number>;

/**
 * Multiply a value by a power of ten while compensating for binary
 * floating-point drift (e.g. `0.1 * 100` -> `10` instead of `10.000000000000002`).
 *
 * @param {number} value The value to scale
 * @param {number} power The multiplier (a power of ten)
 * @returns {number} The drift-corrected product
 */
function accurateMultiply(value: number, power: number): number {
  const valueStr = value.toString();
  const dotIndex = valueStr.indexOf('.');

  if (dotIndex === -1)
    return value * power;

  const decimalPlaces = valueStr.length - dotIndex - 1;
  const multiplier = 10 ** decimalPlaces;

  return (value * multiplier * power) / multiplier;
}

/**
 * @name usePrecision
 * @category Math
 * @description Reactively set the decimal precision of a number.
 *
 * @param {MaybeRefOrGetter<number>} value The source number
 * @param {MaybeRefOrGetter<number>} digits The number of decimal places to keep
 * @param {MaybeRefOrGetter<UsePrecisionOptions>} [options] Precision options
 * @param {UsePrecisionMath} [options.math='round'] The `Math` rounding method to apply
 * @returns {UsePrecisionReturn} A computed ref holding the value at the requested precision
 *
 * @example
 * const value = ref(3.14159);
 * const result = usePrecision(value, 2); // 3.14
 *
 * @example
 * const value = ref(3.14159);
 * const result = usePrecision(value, 2, { math: 'ceil' }); // 3.15
 *
 * @example
 * const value = ref(3.14159);
 * const digits = ref(2);
 * const result = usePrecision(value, digits); // reacts to value and digits
 *
 * @since 0.0.15
 */
export function usePrecision(
  value: MaybeRefOrGetter<number>,
  digits: MaybeRefOrGetter<number>,
  options?: MaybeRefOrGetter<UsePrecisionOptions>,
): UsePrecisionReturn {
  return computed<number>(() => {
    const _value = toValue(value);
    const power = 10 ** toValue(digits);
    const math = toValue(options)?.math ?? 'round';

    return Math[math](accurateMultiply(_value, power)) / power;
  });
}
