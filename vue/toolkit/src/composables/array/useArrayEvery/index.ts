import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type UseArrayEveryReturn = ComputedRef<boolean>;

/**
 * @name useArrayEvery
 * @category Array
 * @description Reactive `Array.prototype.every`. The source array and its items may be reactive.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<T>[]>} list The source array (items can be reactive)
 * @param {(element: T, index: number, array: MaybeRefOrGetter<T>[]) => unknown} fn Predicate to test each element
 * @returns {UseArrayEveryReturn} A computed boolean that is `true` if `fn` returns a truthy value for every element, otherwise `false`
 *
 * @example
 * const list = ref([1, 2, 3, 4]);
 * const allPositive = useArrayEvery(list, n => n > 0); // true
 *
 * @example
 * const items = [ref(2), ref(4), ref(6)];
 * const allEven = useArrayEvery(items, n => n % 2 === 0); // true
 *
 * @since 0.0.15
 */
export function useArrayEvery<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  fn: (element: T, index: number, array: Array<MaybeRefOrGetter<T>>) => unknown,
): UseArrayEveryReturn {
  return computed(() => toValue(list).every((element, index, array) => fn(toValue(element), index, array)));
}
