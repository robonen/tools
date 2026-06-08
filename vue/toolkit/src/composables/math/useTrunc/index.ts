import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * @name useTrunc
 * @category Math
 * @description Reactive `Math.trunc`. Returns the integer part of a number by removing any fractional digits.
 *
 * @param {MaybeRefOrGetter<number>} value The value to truncate
 * @returns {ComputedRef<number>} A computed ref holding the truncated value
 *
 * @example
 * const value = ref(2.9);
 * const truncated = useTrunc(value);
 * // truncated.value === 2
 *
 * @example
 * const truncated = useTrunc(() => -3.7);
 * // truncated.value === -3
 *
 * @since 0.0.15
 */
export function useTrunc(value: MaybeRefOrGetter<number>): ComputedRef<number> {
  return computed<number>(() => Math.trunc(toValue(value)));
}
