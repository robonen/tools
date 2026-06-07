import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * @name useArrayMap
 * @category Reactivity
 * @description Reactive `Array.prototype.map`.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<T>[]>} list The source array (items can be reactive)
 * @param {(element: T, index: number, array: T[]) => U} fn Mapper
 * @returns {ComputedRef<U[]>} The mapped array
 *
 * @example
 * const list = ref([1, 2, 3]);
 * const doubled = useArrayMap(list, n => n * 2); // [2, 4, 6]
 *
 * @since 0.0.15
 */
export function useArrayMap<T, U = T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  fn: (element: T, index: number, array: T[]) => U,
): ComputedRef<U[]> {
  return computed(() => toValue(list).map(i => toValue(i)).map(fn));
}
