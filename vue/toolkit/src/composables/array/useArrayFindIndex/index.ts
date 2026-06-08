import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type UseArrayFindIndexReturn = ComputedRef<number>;

/**
 * @name useArrayFindIndex
 * @category Array
 * @description Reactive `Array.prototype.findIndex`.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<T>[]>} list The source array (items can be reactive)
 * @param {(element: T, index: number, array: T[]) => unknown} fn Predicate testing each element
 * @returns {UseArrayFindIndexReturn} The index of the first matching element, or `-1` if none match
 *
 * @example
 * const list = ref([1, 2, 3]);
 * const index = useArrayFindIndex(list, n => n > 1); // 1
 *
 * @since 0.0.15
 */
export function useArrayFindIndex<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  fn: (element: T, index: number, array: T[]) => unknown,
): UseArrayFindIndexReturn {
  return computed(() => {
    const resolved = toValue(list).map(item => toValue(item));
    return resolved.findIndex(fn);
  });
}
