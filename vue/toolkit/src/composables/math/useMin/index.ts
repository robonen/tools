import { isArray } from '@robonen/stdlib';
import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type MaybeRefOrGetterArgs<T>
  = Array<MaybeRefOrGetter<T>> | [MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>];

/**
 * Resolve a variadic args tuple (numbers, refs/getters, or a single reactive
 * array of refs/getters) into a flat array of resolved values.
 */
function resolveArgs(args: MaybeRefOrGetterArgs<number>): number[] {
  // Fast path: single reactive-array argument (the common useMin(arrayRef) case).
  if (args.length === 1) {
    const value = toValue(args[0] as MaybeRefOrGetter<number | Array<MaybeRefOrGetter<number>>>);

    if (isArray(value))
      return value.map(item => toValue(item));

    return [value];
  }

  // Variadic path: each argument is a single number/ref/getter.
  return (args as Array<MaybeRefOrGetter<number>>).map(arg => toValue(arg));
}

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
 * @since 0.0.15
 */
export function useMin(array: MaybeRefOrGetter<Array<MaybeRefOrGetter<number>>>): ComputedRef<number>;
export function useMin(...args: Array<MaybeRefOrGetter<number>>): ComputedRef<number>;
export function useMin(...args: MaybeRefOrGetterArgs<number>): ComputedRef<number> {
  return computed<number>(() => Math.min(...resolveArgs(args)));
}
