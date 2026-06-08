import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { isObject, isString } from '@robonen/stdlib';

/**
 * Comparator deciding whether two array elements are considered equal.
 */
export type UseArrayDifferenceComparatorFn<T>
  = (value: T, othVal: T) => boolean;

export interface UseArrayDifferenceOptions<T> {
  /**
   * When `true`, returns the symmetric difference: items present in exactly one
   * of the two arrays (`list` XOR `values`). When `false`, returns the
   * asymmetric difference: items in `list` that are not in `values`.
   *
   * @see https://en.wikipedia.org/wiki/Symmetric_difference
   * @default false
   */
  symmetric?: boolean;
  /**
   * Custom comparator function, or a key of `T` to compare a single property by.
   */
  comparator?: UseArrayDifferenceComparatorFn<T> | keyof T;
}

export type UseArrayDifferenceReturn<T = any>
  = ComputedRef<T[]>;

function isArrayDifferenceOptions<T>(value: unknown): value is UseArrayDifferenceOptions<T> {
  // isObject matches PLAIN objects only, so comparator functions/keys never reach here.
  return isObject(value) && ('symmetric' in value || 'comparator' in value);
}

/**
 * @name useArrayDifference
 * @category Array
 * @description Reactive difference of two arrays. Returns items in `list` that are not in `values` (asymmetric), or items in exactly one array (symmetric). Both arrays may be reactive (refs or getters).
 *
 * @param {MaybeRefOrGetter<T[]>} list The source array
 * @param {MaybeRefOrGetter<T[]>} values The array of values to subtract from `list`
 * @param {UseArrayDifferenceComparatorFn<T> | keyof T | UseArrayDifferenceOptions<T>} [comparator] A comparator function, a key of `T` to compare by, or an options object with `comparator`/`symmetric`
 * @param {UseArrayDifferenceOptions<T>} [options] Extra options when `comparator` is a function or key
 * @returns {UseArrayDifferenceReturn<T>} A computed array of the difference
 *
 * @example
 * const list = ref([1, 2, 3, 4, 5]);
 * const values = ref([2, 4]);
 * const diff = useArrayDifference(list, values); // [1, 3, 5]
 *
 * @example
 * const list = ref([{ id: 1 }, { id: 2 }, { id: 3 }]);
 * const values = ref([{ id: 2 }]);
 * const diff = useArrayDifference(list, values, 'id'); // [{ id: 1 }, { id: 3 }]
 *
 * @example
 * const a = ref([1, 2, 3]);
 * const b = ref([2, 3, 4]);
 * const symmetric = useArrayDifference(a, b, { symmetric: true }); // [1, 4]
 *
 * @since 0.0.15
 */
export function useArrayDifference<T>(
  list: MaybeRefOrGetter<T[]>,
  values: MaybeRefOrGetter<T[]>,
  comparator?: UseArrayDifferenceComparatorFn<T>,
  options?: UseArrayDifferenceOptions<T>,
): UseArrayDifferenceReturn<T>;
export function useArrayDifference<T>(
  list: MaybeRefOrGetter<T[]>,
  values: MaybeRefOrGetter<T[]>,
  comparator?: keyof T,
  options?: UseArrayDifferenceOptions<T>,
): UseArrayDifferenceReturn<T>;
export function useArrayDifference<T>(
  list: MaybeRefOrGetter<T[]>,
  values: MaybeRefOrGetter<T[]>,
  options?: UseArrayDifferenceOptions<T>,
): UseArrayDifferenceReturn<T>;
export function useArrayDifference<T>(
  list: MaybeRefOrGetter<T[]>,
  values: MaybeRefOrGetter<T[]>,
  comparator?: UseArrayDifferenceComparatorFn<T> | keyof T | UseArrayDifferenceOptions<T>,
  options?: UseArrayDifferenceOptions<T>,
): UseArrayDifferenceReturn<T> {
  let symmetric = false;
  let resolved: UseArrayDifferenceComparatorFn<T> | keyof T | undefined;

  if (isArrayDifferenceOptions<T>(comparator)) {
    symmetric = comparator.symmetric ?? false;
    resolved = comparator.comparator;
  }
  else {
    resolved = comparator;
    symmetric = options?.symmetric ?? false;
    // An explicit comparator/key in `options` wins over the positional argument.
    if (options?.comparator !== undefined)
      resolved = options.comparator;
  }

  // Resolve the comparator once instead of rebuilding it on every recompute.
  let compare: UseArrayDifferenceComparatorFn<T>;

  if (isString(resolved) || typeof resolved === 'symbol' || typeof resolved === 'number') {
    const key = resolved as keyof T;
    compare = (value, othVal) => value[key] === othVal[key];
  }
  else if (typeof resolved === 'function') {
    compare = resolved;
  }
  else {
    compare = (value, othVal) => value === othVal;
  }

  return computed(() => {
    const source = toValue(list);
    const other = toValue(values);

    // Items in `source` absent from `other`.
    const diff = source.filter(value => !other.some(othVal => compare(value, othVal)));

    if (!symmetric)
      return diff;

    // Items in `other` absent from `source`, appended for the symmetric difference.
    for (const value of other) {
      if (!source.some(srcVal => compare(value, srcVal)))
        diff.push(value);
    }

    return diff;
  });
}
