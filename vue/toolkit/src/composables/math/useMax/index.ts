import { isArray } from '@robonen/stdlib';
import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import type { MaybeComputedRefArgs } from '@/types';

/**
 * @name useMax
 * @category Math
 * @description Reactively compute the maximum of the provided numbers. Accepts
 * either a variadic list of numbers (each a ref, getter, or raw value) or a
 * single reactive array whose items may themselves be refs/getters.
 *
 * @param {...MaybeRefOrGetter<number>} args The values to compare, or a single reactive array of values
 * @returns {ComputedRef<number>} A computed ref of the largest value (`-Infinity` when empty)
 *
 * @example
 * const a = ref(1);
 * const b = ref(3);
 * const max = useMax(a, b, 2); // 3
 *
 * @example
 * const list = ref([1, 5, 2]);
 * const max = useMax(list); // 5
 *
 * @example
 * const list = ref([ref(1), () => 5, 2]);
 * const max = useMax(list); // 5
 *
 * @since 0.0.15
 */
export function useMax(array: MaybeRefOrGetter<Array<MaybeRefOrGetter<number>>>): ComputedRef<number>;
export function useMax(...args: Array<MaybeRefOrGetter<number>>): ComputedRef<number>;
export function useMax(...args: MaybeComputedRefArgs<number>): ComputedRef<number> {
  return computed<number>(() => {
    // Avoid Math.max(...array): large spreads can overflow the call stack, and
    // a single pass skips the intermediate flattened array that flatMap builds.
    let max = Number.NEGATIVE_INFINITY;

    for (const arg of args) {
      const value = toValue(arg);

      if (isArray(value)) {
        for (const item of value) {
          const inner = toValue(item);
          if (inner > max) max = inner;
        }
      }
      else if (value > max) {
        max = value;
      }
    }

    return max;
  });
}
