import { computed, isRef, toValue, watchEffect } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import { isFunction } from '@robonen/stdlib';

export type UseSortedCompareFn<T = any>
  = (a: T, b: T) => number;

export type UseSortedFn<T = any>
  = (arr: T[], compareFn: UseSortedCompareFn<T>) => T[];

export interface UseSortedOptions<T = any> {
  /**
   * The sort algorithm to apply. Receives a copy of the array (or the source
   * itself in `dirty` mode) and the resolved compare function.
   *
   * Defaults to a guaranteed-stable merge sort, so equal elements always keep
   * their original relative order regardless of the JS engine.
   */
  sortFn?: UseSortedFn<T>;
  /**
   * The compare function used to order two elements, matching the signature of
   * `Array.prototype.sort`.
   *
   * @default (a, b) => a - b
   */
  compareFn?: UseSortedCompareFn<T>;
  /**
   * Sort the source array in place instead of returning a sorted copy.
   *
   * When `true`, the returned ref is the source itself and its values are
   * re-sorted whenever the source changes.
   *
   * @default false
   */
  dirty?: boolean;
}

const defaultCompare: UseSortedCompareFn<number> = (a, b) => a - b;

/**
 * Guaranteed-stable merge sort. Equal elements keep their original order on
 * every engine, unlike the historically engine-dependent `Array.prototype.sort`.
 */
function stableSort<T>(array: T[], compareFn: UseSortedCompareFn<T>): T[] {
  const length = array.length;
  if (length < 2)
    return array;

  const middle = length >> 1;
  const left = stableSort(array.slice(0, middle), compareFn);
  const right = stableSort(array.slice(middle), compareFn);

  const result: T[] = Array.from({ length });
  let i = 0;
  let l = 0;
  let r = 0;

  while (l < left.length && r < right.length) {
    // Bounds are guaranteed by the loop condition; `!` drops the index-access undefined.
    // `<= 0` keeps left (earlier) element first -> stability.
    if (compareFn(left[l]!, right[r]!) <= 0)
      result[i++] = left[l++]!;
    else
      result[i++] = right[r++]!;
  }

  while (l < left.length)
    result[i++] = left[l++]!;
  while (r < right.length)
    result[i++] = right[r++]!;

  return result;
}

const defaultSortFn: UseSortedFn = <T>(source: T[], compareFn: UseSortedCompareFn<T>): T[] => stableSort(source, compareFn);

/**
 * @name useSorted
 * @category Array
 * @description Reactive, stable sorted copy of an array. Mirrors `Array.prototype.sort` but never mutates the source by default and guarantees stable ordering.
 *
 * @param {MaybeRefOrGetter<T[]>} source The source array (ref, getter, or plain array)
 * @param {UseSortedCompareFn<T> | UseSortedOptions<T>} [compareFn] A compare function, or an options object
 * @param {Omit<UseSortedOptions<T>, 'compareFn'>} [options] Extra options when the second argument is a compare function
 * @returns {ComputedRef<T[]> | Ref<T[]>} A computed sorted copy (default), or the source ref when `dirty` is `true`
 *
 * @example
 * const list = ref([3, 1, 2]);
 * const sorted = useSorted(list); // [1, 2, 3]
 *
 * @example
 * // custom compare function
 * const users = ref([{ age: 30 }, { age: 18 }]);
 * const byAge = useSorted(users, (a, b) => a.age - b.age);
 *
 * @example
 * // sort the source in place
 * const list = ref([3, 1, 2]);
 * useSorted(list, { dirty: true });
 * // list.value is now [1, 2, 3]
 *
 * @since 0.0.15
 */
export function useSorted<T = any>(source: Ref<T[]>, compareFn?: UseSortedCompareFn<T>): Ref<T[]>;
export function useSorted<T = any>(source: MaybeRefOrGetter<T[]>, compareFn?: UseSortedCompareFn<T>): ComputedRef<T[]>;
export function useSorted<T = any>(source: Ref<T[]>, options?: UseSortedOptions<T>): Ref<T[]>;
export function useSorted<T = any>(source: MaybeRefOrGetter<T[]>, options?: UseSortedOptions<T>): ComputedRef<T[]>;
export function useSorted<T = any>(source: Ref<T[]>, compareFn?: UseSortedCompareFn<T>, options?: Omit<UseSortedOptions<T>, 'compareFn'>): Ref<T[]>;
export function useSorted<T = any>(source: MaybeRefOrGetter<T[]>, compareFn?: UseSortedCompareFn<T>, options?: Omit<UseSortedOptions<T>, 'compareFn'>): ComputedRef<T[]>;
export function useSorted<T = any>(
  source: MaybeRefOrGetter<T[]>,
  compareFnOrOptions?: UseSortedCompareFn<T> | UseSortedOptions<T>,
  maybeOptions?: Omit<UseSortedOptions<T>, 'compareFn'>,
): ComputedRef<T[]> | Ref<T[]> {
  let compareFn: UseSortedCompareFn<T> = defaultCompare as UseSortedCompareFn<T>;
  let options: UseSortedOptions<T> = {};

  if (isFunction(compareFnOrOptions)) {
    compareFn = compareFnOrOptions;
    options = maybeOptions ?? {};
  }
  else if (compareFnOrOptions) {
    options = compareFnOrOptions;
    compareFn = options.compareFn ?? (defaultCompare as UseSortedCompareFn<T>);
  }

  const {
    dirty = false,
    sortFn = defaultSortFn,
  } = options;

  if (!dirty) {
    return computed<T[]>({
      get: () => sortFn([...toValue(source)], compareFn),
      set: (value) => {
        if (isRef(source))
          (source as Ref<T[]>).value = value;
      },
    });
  }

  watchEffect(() => {
    const result = sortFn(toValue(source), compareFn);
    if (isRef(source))
      (source as Ref<T[]>).value = result;
    else
      (toValue(source)).splice(0, toValue(source).length, ...result);
  });

  return source as Ref<T[]>;
}
