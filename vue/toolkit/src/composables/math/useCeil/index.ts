import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type UseCeilReturn = ComputedRef<number>;

/**
 * @name useCeil
 * @category Math
 * @description Reactive `Math.ceil`. Rounds a number up to the next largest integer.
 *
 * @param {MaybeRefOrGetter<number>} value The value to round up
 * @returns {UseCeilReturn} A readonly computed ref of the rounded-up value
 *
 * @example
 * const value = ref(0.95);
 * const ceiled = useCeil(value); // 1
 *
 * @example
 * const ceiled = useCeil(() => 7.004); // 8
 *
 * @since 0.0.15
 */
export function useCeil(value: MaybeRefOrGetter<number>): UseCeilReturn {
  return computed<number>(() => Math.ceil(toValue(value)));
}
