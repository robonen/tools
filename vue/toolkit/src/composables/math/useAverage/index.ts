import { isArray, sum } from '@robonen/stdlib';
import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import type { MaybeComputedRefArgs } from '@/types';

/**
 * @name useAverage
 * @category Math
 * @description Reactively compute the average (arithmetic mean) of the provided
 * numbers. Accepts either a variadic list of numbers (each a ref, getter, or raw
 * value) or a single reactive array whose items may themselves be refs/getters.
 * Returns `NaN` when there are no values, mirroring `0 / 0`.
 *
 * @param {...MaybeRefOrGetter<number>} args The values to average, or a single reactive array of values
 * @returns {ComputedRef<number>} A computed ref of the mean (`NaN` when empty)
 *
 * @example
 * const a = ref(1);
 * const b = ref(3);
 * const avg = useAverage(a, b, 2); // 2
 *
 * @example
 * const list = ref([1, 5, 3]);
 * const avg = useAverage(list); // 3
 *
 * @example
 * const list = ref([ref(2), () => 4, 6]);
 * const avg = useAverage(list); // 4
 *
 * @since 0.0.15
 */
export function useAverage(array: MaybeRefOrGetter<Array<MaybeRefOrGetter<number>>>): ComputedRef<number>;
export function useAverage(...args: Array<MaybeRefOrGetter<number>>): ComputedRef<number>;
export function useAverage(...args: MaybeComputedRefArgs<number>): ComputedRef<number> {
  return computed<number>(() => {
    // Collect into a single flat numeric array so we can reuse stdlib `sum`
    // and divide by the real count in one pass — no intermediate flatMap.
    const values: number[] = [];

    for (const arg of args) {
      const value = toValue(arg);

      if (isArray(value)) {
        for (const inner of value)
          values.push(toValue(inner));
      }
      else {
        values.push(value);
      }
    }

    // Empty -> NaN (0 / 0), matching the mathematical definition of a mean.
    return sum(values) / values.length;
  });
}
