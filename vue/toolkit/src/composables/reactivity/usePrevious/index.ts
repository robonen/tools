import { shallowReadonly, shallowRef, toRef, watch } from 'vue';
import type { MaybeRefOrGetter, ShallowRef, WatchOptions } from 'vue';

export type UsePreviousOptions = Pick<WatchOptions, 'deep' | 'flush'>;

/**
 * @name usePrevious
 * @category Reactivity
 * @description Track the previous value of a ref, getter, or reactive source.
 *
 * @param {MaybeRefOrGetter<T>} value The source value to track
 * @param {T} [initialValue] The initial previous value, or an options object
 * @param {UsePreviousOptions} [options={}] Watch options (`deep`, `flush`)
 * @returns {Readonly<ShallowRef<T | undefined>>} The previous value of the source
 *
 * @example
 * const count = ref(0);
 * const prev = usePrevious(count);
 * count.value = 1; // prev.value === 0
 *
 * @example
 * const count = ref(0);
 * const prev = usePrevious(count, -1); // prev.value === -1 until count changes
 *
 * @example
 * const state = reactive({ n: 1 });
 * const prev = usePrevious(() => ({ ...state }), undefined, { deep: true });
 *
 * @since 0.0.15
 */
export function usePrevious<T>(value: MaybeRefOrGetter<T>, initialValue: T, options?: UsePreviousOptions): Readonly<ShallowRef<T>>;
export function usePrevious<T>(value: MaybeRefOrGetter<T>, initialValue?: undefined, options?: UsePreviousOptions): Readonly<ShallowRef<T | undefined>>;
export function usePrevious<T>(
  value: MaybeRefOrGetter<T>,
  initialValue?: T,
  options: UsePreviousOptions = {},
): Readonly<ShallowRef<T | undefined>> {
  const previous = shallowRef<T | undefined>(initialValue);

  watch(
    toRef(value),
    (_, oldValue) => {
      previous.value = oldValue;
    },
    { flush: options.flush ?? 'sync', deep: options.deep },
  );

  return shallowReadonly(previous);
}
