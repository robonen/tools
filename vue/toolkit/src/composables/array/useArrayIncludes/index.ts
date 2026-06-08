import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { isObject, isString } from '@robonen/stdlib';

/**
 * Comparator deciding whether an array element equals the searched value.
 */
export type UseArrayIncludesComparatorFn<T, V>
  = (element: T, value: V, index: number, array: T[]) => boolean;

export interface UseArrayIncludesOptions<T, V> {
  /**
   * Index at which to start searching (negative counts from the end, like `Array.prototype.includes`).
   *
   * @default 0
   */
  fromIndex?: number;
  /**
   * Custom comparator function, or a key of `T` to compare a single property by.
   */
  comparator?: UseArrayIncludesComparatorFn<T, V> | keyof T;
}

export type UseArrayIncludesReturn = ComputedRef<boolean>;

function isArrayIncludesOptions<T, V>(value: unknown): value is UseArrayIncludesOptions<T, V> {
  // isObject matches PLAIN objects only, so functions/keys never reach here.
  return isObject(value) && ('fromIndex' in value || 'comparator' in value);
}

/**
 * @name useArrayIncludes
 * @category Array
 * @description Reactive `Array.prototype.includes` with an optional comparator and `fromIndex`. The source array and its items may be reactive.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<T>[]>} list The source array (items can be reactive)
 * @param {MaybeRefOrGetter<V>} value The value to search for (may be reactive)
 * @param {UseArrayIncludesComparatorFn<T, V> | keyof T | UseArrayIncludesOptions<T, V>} [comparator] A comparator function, a key of `T` to compare by, or an options object with `comparator`/`fromIndex`
 * @returns {UseArrayIncludesReturn} A computed boolean that is `true` when the value is found
 *
 * @example
 * const list = ref([1, 2, 3, 4]);
 * const hasThree = useArrayIncludes(list, 3); // true
 *
 * @example
 * const list = ref([{ id: 1 }, { id: 2 }]);
 * const hasTwo = useArrayIncludes(list, 2, 'id'); // compare by key
 *
 * @example
 * const list = ref(['a', 'b', 'a']);
 * const fromSecond = useArrayIncludes(list, 'a', { fromIndex: 1 }); // true
 *
 * @since 0.0.15
 */
export function useArrayIncludes<T, V = T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  value: MaybeRefOrGetter<V>,
  comparator?: UseArrayIncludesComparatorFn<T, V>,
): UseArrayIncludesReturn;
export function useArrayIncludes<T, V = T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  value: MaybeRefOrGetter<V>,
  comparator?: keyof T,
): UseArrayIncludesReturn;
export function useArrayIncludes<T, V = T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  value: MaybeRefOrGetter<V>,
  options?: UseArrayIncludesOptions<T, V>,
): UseArrayIncludesReturn;
export function useArrayIncludes<T, V = T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  value: MaybeRefOrGetter<V>,
  comparator?: UseArrayIncludesComparatorFn<T, V> | keyof T | UseArrayIncludesOptions<T, V>,
): UseArrayIncludesReturn {
  let fromIndex = 0;
  let resolved = comparator;

  if (isArrayIncludesOptions<T, V>(resolved)) {
    fromIndex = resolved.fromIndex ?? 0;
    resolved = resolved.comparator;
  }

  // Resolve the comparator once instead of on every recompute.
  let compare: UseArrayIncludesComparatorFn<T, V>;

  if (isString(resolved) || typeof resolved === 'symbol' || typeof resolved === 'number') {
    const key = resolved as keyof T;
    compare = (element, searched) => element[key] === (searched as unknown);
  }
  else if (typeof resolved === 'function') {
    compare = resolved;
  }
  else {
    compare = (element, searched) => (element as unknown) === searched;
  }

  return computed(() => {
    const array = toValue(list);
    const searched = toValue(value);
    const length = array.length;

    // Resolve a negative / out-of-range fromIndex the same way Array.includes does.
    let start = fromIndex < 0 ? length + fromIndex : fromIndex;
    if (start < 0)
      start = 0;

    for (let index = start; index < length; index++) {
      // `index` is bounded by `length`; `!` drops the index-access undefined.
      if (compare(toValue(array[index]!), searched, index, array as T[]))
        return true;
    }

    return false;
  });
}
