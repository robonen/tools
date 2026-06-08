import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * @name useArrayFilter
 * @category Array
 * @description Reactive `Array.prototype.filter`.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<T>[]>} list The source array (items can be reactive)
 * @param {(element: T, index: number, array: T[]) => boolean} fn Predicate
 * @returns {ComputedRef<T[]>} The filtered array
 *
 * @example
 * const list = ref([1, 2, 3, 4]);
 * const even = useArrayFilter(list, n => n % 2 === 0); // [2, 4]
 *
 * @since 0.0.15
 */
export function useArrayFilter<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  fn: (element: T, index: number, array: T[]) => boolean,
): ComputedRef<T[]> {
  return computed(() => toValue(list).map(i => toValue(i)).filter(fn));
}
