import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type UseArraySomeReturn = ComputedRef<boolean>;

/**
 * @name useArraySome
 * @category Array
 * @description Reactive `Array.prototype.some`. The source array and its items may be reactive.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<T>[]>} list The source array (items can be reactive)
 * @param {(element: T, index: number, array: MaybeRefOrGetter<T>[]) => unknown} fn Predicate to test each element
 * @returns {UseArraySomeReturn} A computed boolean that is `true` if `fn` returns a truthy value for any element, otherwise `false`
 *
 * @example
 * const list = ref([1, 2, 3, 4]);
 * const hasEven = useArraySome(list, n => n % 2 === 0); // true
 *
 * @example
 * const items = [ref(1), ref(3), ref(5)];
 * const hasEven = useArraySome(items, n => n % 2 === 0); // false
 *
 * @since 0.0.15
 */
export function useArraySome<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  fn: (element: T, index: number, array: Array<MaybeRefOrGetter<T>>) => unknown,
): UseArraySomeReturn {
  return computed(() => toValue(list).some((element, index, array) => fn(toValue(element), index, array)));
}
