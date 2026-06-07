import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { clamp, isFunction, isNumber, isString } from '@robonen/stdlib';

export type UseToNumberMethod = 'parseFloat' | 'parseInt' | ((value: number | string) => number);

export interface UseToNumberOptions {
  /**
   * Parsing method for string input, or a custom converter function
   *
   * @default 'parseFloat'
   */
  method?: UseToNumberMethod;

  /**
   * Radix for `parseInt`
   */
  radix?: number;

  /**
   * Resolve `NaN` to `0`
   *
   * @default false
   */
  nanToZero?: boolean;

  /**
   * Clamp the result to a minimum value (applied after parsing)
   */
  min?: number;

  /**
   * Clamp the result to a maximum value (applied after parsing)
   */
  max?: number;
}

/**
 * @name useToNumber
 * @category Reactivity
 * @description Reactively convert a string or number ref to a number.
 *
 * @param {MaybeRefOrGetter<number | string>} value The source value (can be reactive)
 * @param {UseToNumberOptions} [options={}] Options
 * @returns {ComputedRef<number>} The numeric value
 *
 * @example
 * const str = ref('42.5');
 * const num = useToNumber(str); // 42.5
 *
 * @example
 * // custom converter and clamping
 * const n = useToNumber(input, { method: v => Math.round(+v), min: 0, max: 100 });
 *
 * @since 0.0.15
 */
export function useToNumber(
  value: MaybeRefOrGetter<number | string>,
  options: UseToNumberOptions = {},
): ComputedRef<number> {
  const {
    method = 'parseFloat',
    radix,
    nanToZero = false,
    min,
    max,
  } = options;

  // Hoist the parser resolution out of the computed so the property lookup /
  // function-type check happens once instead of on every recompute.
  const parse: (source: number | string) => number = isFunction(method)
    ? method
    : source => (isNumber(source) ? source : Number[method](source, radix));

  const hasMin = isNumber(min);
  const hasMax = isNumber(max);

  return computed<number>(() => {
    const source = toValue(value);

    let resolved = isString(source) || isFunction(method)
      ? parse(source)
      : source;

    if (nanToZero && Number.isNaN(resolved))
      resolved = 0;

    if (hasMin && hasMax)
      resolved = clamp(resolved, min, max);
    else if (hasMin && resolved < min)
      resolved = min;
    else if (hasMax && resolved > max)
      resolved = max;

    return resolved;
  });
}
