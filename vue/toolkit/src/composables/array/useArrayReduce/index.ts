import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type UseArrayReducer<PV, CV, R>
  = (accumulator: PV, currentValue: CV, currentIndex: number) => R;

export type UseArrayReduceReturn<T> = ComputedRef<T>;

/**
 * @name useArrayReduce
 * @category Array
 * @description Reactive `Array.prototype.reduce`, with an optional initial value.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<T>[]>} list The source array (items can be reactive)
 * @param {UseArrayReducer<T, T, T>} reducer A reducer callback applied to each element
 * @returns {UseArrayReduceReturn<T>} The reduced value
 *
 * @example
 * const list = ref([1, 2, 3, 4]);
 * const sum = useArrayReduce(list, (acc, n) => acc + n); // 10
 *
 * @since 0.0.15
 */
export function useArrayReduce<T>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  reducer: UseArrayReducer<T, T, T>,
): UseArrayReduceReturn<T>;

/**
 * @name useArrayReduce
 * @category Array
 * @description Reactive `Array.prototype.reduce`, with an optional initial value.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<T>[]>} list The source array (items can be reactive)
 * @param {UseArrayReducer<U, T, U>} reducer A reducer callback applied to each element
 * @param {MaybeRefOrGetter<U>} initialValue A reactive value to seed the accumulator with
 * @returns {UseArrayReduceReturn<U>} The reduced value
 *
 * @example
 * const list = ref([1, 2, 3, 4]);
 * const sum = useArrayReduce(list, (acc, n) => acc + n, 100); // 110
 *
 * @since 0.0.15
 */
export function useArrayReduce<T, U>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  reducer: UseArrayReducer<U, T, U>,
  initialValue: MaybeRefOrGetter<U>,
): UseArrayReduceReturn<U>;

export function useArrayReduce<T, U>(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>,
  reducer: UseArrayReducer<U, T, U>,
  initialValue?: MaybeRefOrGetter<U>,
): UseArrayReduceReturn<U> {
  const step = (
    accumulator: U,
    current: MaybeRefOrGetter<T>,
    index: number,
  ): U => reducer(accumulator, toValue(current), index);

  // Capture presence here (arguments.length, not a default value) so that an
  // explicitly-passed `undefined` is still honoured as a real initial value.
  const hasInitial = arguments.length >= 3;

  return computed(() => {
    const resolved = toValue(list);

    return hasInitial
      ? resolved.reduce(step, toValue(initialValue as MaybeRefOrGetter<U>))
      : (resolved as unknown as U[]).reduce(step as unknown as (a: U, c: U, i: number) => U);
  });
}
