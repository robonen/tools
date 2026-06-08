import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { isString, unique } from '@robonen/stdlib';

/**
 * Equality comparator deciding whether two array elements are duplicates.
 */
export type UseArrayUniqueComparatorFn<T>
  = (a: T, b: T, array: T[]) => boolean;

/**
 * Extracts the comparison key for an element. Two elements that produce the
 * same key (via `===`/`Set` identity) are considered duplicates.
 */
export type UseArrayUniqueKeyFn<T>
  = (element: T) => PropertyKey;

export type UseArrayUniqueReturn<T = unknown> = ComputedRef<T[]>;

/**
 * @name useArrayUnique
 * @category Array
 * @description Reactive de-duplicated array. By default uses `Set` identity (`===`); an optional key of `T`, key extractor (both O(n)), or full comparator (O(n²)) customizes equality. The source array and its items may be reactive. First-seen insertion order is preserved.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<T>[]>} list The source array (items can be reactive)
 * @param {UseArrayUniqueComparatorFn<T> | UseArrayUniqueKeyFn<T> | keyof T} [comparator] A custom equality comparator, a key extractor, or a key of `T` to de-duplicate by
 * @returns {UseArrayUniqueReturn<T>} A computed array containing only the first occurrence of each unique element
 *
 * @example
 * const list = ref([1, 2, 2, 3, 3, 3]);
 * const uniq = useArrayUnique(list); // [1, 2, 3]
 *
 * @example
 * const list = ref([{ id: 1 }, { id: 2 }, { id: 1 }]);
 * const byId = useArrayUnique(list, 'id'); // [{ id: 1 }, { id: 2 }]
 *
 * @example
 * const list = ref([{ id: 1 }, { id: 2 }, { id: 1 }]);
 * const byKey = useArrayUnique(list, item => item.id); // [{ id: 1 }, { id: 2 }]
 *
 * @example
 * const list = ref([1.1, 1.4, 2.2]);
 * const byFloor = useArrayUnique(list, (a, b) => Math.floor(a) === Math.floor(b)); // [1.1, 2.2]
 *
 * @since 0.0.15
 */
export function useArrayUnique<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
): UseArrayUniqueReturn<T>;
export function useArrayUnique<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  comparator: keyof T,
): UseArrayUniqueReturn<T>;
export function useArrayUnique<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  comparator: UseArrayUniqueKeyFn<T>,
): UseArrayUniqueReturn<T>;
export function useArrayUnique<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  comparator: UseArrayUniqueComparatorFn<T>,
): UseArrayUniqueReturn<T>;
export function useArrayUnique<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  comparator?: UseArrayUniqueComparatorFn<T> | UseArrayUniqueKeyFn<T> | keyof T,
): UseArrayUniqueReturn<T> {
  // Resolve the comparison strategy once, not on every recompute.

  // Key of T (string | number | symbol) -> O(n) first-seen-wins key de-dup.
  if (isString(comparator) || typeof comparator === 'symbol' || typeof comparator === 'number') {
    const key = comparator as keyof T;
    return computed<T[]>(() => uniqueByKey(resolve(list), element => element[key] as PropertyKey));
  }

  if (typeof comparator === 'function') {
    // A unary key extractor stays O(n); a binary comparator falls back to O(n²)
    // pairwise comparison (unavoidable for arbitrary equality). Branch on arity.
    if (comparator.length <= 1) {
      const extractor = comparator as UseArrayUniqueKeyFn<T>;
      return computed<T[]>(() => uniqueByKey(resolve(list), extractor));
    }

    const compare = comparator as UseArrayUniqueComparatorFn<T>;
    return computed<T[]>(() => {
      const array = resolve(list);
      const result: T[] = [];

      for (const value of array) {
        if (!result.some(kept => compare(value, kept, array)))
          result.push(value);
      }

      return result;
    });
  }

  // Default: identity (`===`) de-dup via stdlib unique's Set fast path.
  return computed<T[]>(() => unique(resolve(list)));
}

/**
 * Resolves the (possibly reactive) list and each (possibly reactive) item.
 */
function resolve<T>(list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>): T[] {
  return toValue(list).map(element => toValue(element));
}

/**
 * O(n) de-duplication that keeps the FIRST element seen per extracted key
 * (matching VueUse's first-occurrence semantics). stdlib `unique` is
 * last-write-wins per key, so we track seen keys in a Set here instead.
 */
function uniqueByKey<T>(array: T[], extractor: UseArrayUniqueKeyFn<T>): T[] {
  const seen = new Set<PropertyKey>();
  const result: T[] = [];

  for (const element of array) {
    const key = extractor(element);

    if (seen.has(key))
      continue;

    seen.add(key);
    result.push(element);
  }

  return result;
}
