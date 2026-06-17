import { isArray } from '@robonen/stdlib';
import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import type { MaybeComputedRefArgs } from '@/types';

/**
 * @name useMin
 * @category Math
 * @description Reactive `Math.min`. Accepts a variadic list of numbers (each a
 * ref, getter, or plain value) or a single reactive array whose items may
 * themselves be refs/getters.
 *
 * @param {...MaybeRefOrGetter<number>} args A list of numeric refs/getters/values, or a single reactive array of them
 * @returns {ComputedRef<number>} A computed of the smallest resolved value (`Infinity` when empty, matching `Math.min`)
 *
 * @example
 * const a = ref(2);
 * const b = ref(5);
 * const min = useMin(a, b, 10); // 2
 *
 * @example
 * const list = ref([2, ref(5), () => 10]);
 * const min = useMin(list); // 2
 *
 * @since 0.0.14
 */
export function useMin(array: MaybeRefOrGetter<Array<MaybeRefOrGetter<number>>>): ComputedRef<number>;
export function useMin(...args: Array<MaybeRefOrGetter<number>>): ComputedRef<number>;
export function useMin(...args: MaybeComputedRefArgs<number>): ComputedRef<number> {
  return computed<number>(() => {
    // Avoid Math.min(...array): large spreads can overflow the call stack, and
    // a single pass skips the intermediate flattened array that flatMap builds.
    let min = Number.POSITIVE_INFINITY;

    for (const arg of args) {
      const value = toValue(arg);

      if (isArray(value)) {
        for (const item of value) {
          const inner = toValue(item);
          if (inner < min) min = inner;
        }
      }
      else if (value < min) {
        min = value;
      }
    }

    return min;
  });
}
