import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * @name useArrayFind
 * @category Array
 * @description Reactive `Array.prototype.find`.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<T>[]>} list The source array (items can be reactive)
 * @param {(element: T, index: number, array: T[]) => boolean} fn Predicate
 * @returns {ComputedRef<T | undefined>} The first matching element
 *
 * @example
 * const list = ref([1, 2, 3]);
 * const found = useArrayFind(list, n => n > 1); // 2
 *
 * @since 0.0.15
 */
export function useArrayFind<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  fn: (element: T, index: number, array: T[]) => boolean,
): ComputedRef<T | undefined> {
  return computed(() => toValue(list).map(i => toValue(i)).find(fn));
}
