import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * @name useFloor
 * @category Math
 * @description Reactive `Math.floor`. Returns the largest integer less than or equal to the given value
 *
 * @param {MaybeRefOrGetter<number>} value The value to floor
 * @returns {ComputedRef<number>} The floored value
 *
 * @example
 * const value = ref(5.95);
 * const floored = useFloor(value); // 5
 *
 * @example
 * const floored = useFloor(() => 5.05); // 5
 *
 * @since 0.0.15
 */
export function useFloor(value: MaybeRefOrGetter<number>): ComputedRef<number> {
  return computed<number>(() => Math.floor(toValue(value)));
}
