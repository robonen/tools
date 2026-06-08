import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type UseAbsReturn = ComputedRef<number>;

/**
 * @name useAbs
 * @category Math
 * @description Reactive `Math.abs` of a number ref or getter
 *
 * @param {MaybeRefOrGetter<number>} value The value to take the absolute value of
 * @returns {UseAbsReturn} A readonly computed of `Math.abs(value)`
 *
 * @example
 * const value = ref(-42);
 * const abs = useAbs(value);
 * // abs.value === 42
 *
 * @example
 * const abs = useAbs(() => -10);
 * // abs.value === 10
 *
 * @since 0.0.15
 */
export function useAbs(value: MaybeRefOrGetter<number>): UseAbsReturn {
  return computed(() => Math.abs(toValue(value)));
}
