import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type UseArrayFindLastReturn<T = unknown>
  = ComputedRef<T | undefined>;

/**
 * `Array.prototype.findLast` polyfill for runtimes older than ES2023.
 */
function findLast<T>(
  array: T[],
  fn: (element: T, index: number, array: T[]) => unknown,
): T | undefined {
  let index = array.length;
  while (index-- > 0) {
    const element = array[index]!;
    if (fn(element, index, array))
      return element;
  }
  return undefined;
}

const hasNativeFindLast = typeof Array.prototype.findLast === 'function';

/**
 * @name useArrayFindLast
 * @category Array
 * @description Reactive `Array.prototype.findLast`.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<T>[]>} list The source array (items can be reactive)
 * @param {(element: T, index: number, array: T[]) => unknown} fn Predicate testing each element
 * @returns {UseArrayFindLastReturn<T>} The last matching element, or `undefined` if none match
 *
 * @example
 * const list = ref([1, 2, 3, 4]);
 * const found = useArrayFindLast(list, n => n % 2 === 0); // 4
 *
 * @since 0.0.15
 */
export function useArrayFindLast<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  fn: (element: T, index: number, array: T[]) => unknown,
): UseArrayFindLastReturn<T> {
  return computed(() => {
    const resolved = toValue(list).map(item => toValue(item));
    return hasNativeFindLast ? resolved.findLast(fn) : findLast(resolved, fn);
  });
}
