import { isArray, sum } from '@robonen/stdlib';
import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import type { MaybeComputedRefArgs } from '@/types';

/**
 * @name useSum
 * @category Math
 * @description Reactively compute the sum of the provided numbers. Accepts
 * either a variadic list of numbers (each a ref, getter, or raw value) or a
 * single reactive array whose items may themselves be refs/getters.
 *
 * @param {...MaybeRefOrGetter<number>} args The values to add, or a single reactive array of values
 * @returns {ComputedRef<number>} A computed ref of the total (`0` when empty)
 *
 * @example
 * const a = ref(1);
 * const b = ref(3);
 * const total = useSum(a, b, 2); // 6
 *
 * @example
 * const list = ref([1, 5, 2]);
 * const total = useSum(list); // 8
 *
 * @example
 * const list = ref([ref(1), () => 5, 2]);
 * const total = useSum(list); // 8
 *
 * @since 0.0.15
 */
export function useSum(array: MaybeRefOrGetter<Array<MaybeRefOrGetter<number>>>): ComputedRef<number>;
export function useSum(...args: Array<MaybeRefOrGetter<number>>): ComputedRef<number>;
export function useSum(...args: MaybeComputedRefArgs<number>): ComputedRef<number> {
  return computed<number>(() => {
    // Collect the resolved values into a single flat array, unwrapping refs and
    // getters at both the top level and inside a reactive array argument, then
    // delegate the reduction to stdlib `sum` (one pass, no per-arg closures).
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

    return sum(values);
  });
}
