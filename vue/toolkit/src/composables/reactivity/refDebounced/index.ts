import { shallowReadonly, shallowRef, toRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { useDebounceFn } from '@/composables/utilities/useDebounceFn';
import type { UseDebounceFnOptions } from '@/composables/utilities/useDebounceFn';

export type RefDebouncedOptions = UseDebounceFnOptions;

export type RefDebouncedReturn<T> = Readonly<Ref<T>>;

/**
 * @name refDebounced
 * @category Reactivity
 * @description A readonly ref whose value mirrors a source but only after
 * updates stop arriving for `ms`. Wraps the source change in our debounce
 * primitive (built on `debounceFilter`), so rapid bursts collapse into a single
 * delayed write. Supports a `maxWait` ceiling so the value still progresses
 * under sustained input, and tears its timer down with the owning scope.
 *
 * @param {MaybeRefOrGetter<T>} source The ref, getter, or reactive source to debounce
 * @param {MaybeRefOrGetter<number>} [ms=200] Debounce delay in milliseconds (can be reactive)
 * @param {RefDebouncedOptions} [options={}] Debounce options (`maxWait`, `rejectOnCancel`)
 * @returns {RefDebouncedReturn<T>} A readonly ref tracking the source with debounced updates
 *
 * @example
 * const input = ref('');
 * const debounced = refDebounced(input, 300);
 * // debounced.value lags `input` by 300ms of quiet
 *
 * @example
 * // Guarantee the debounced value advances at least every 1000ms
 * const debounced = refDebounced(input, 300, { maxWait: 1000 });
 *
 * @since 0.0.15
 */
export function refDebounced<T>(
  source: MaybeRefOrGetter<T>,
  ms: MaybeRefOrGetter<number> = 200,
  options: RefDebouncedOptions = {},
): RefDebouncedReturn<T> {
  const reference = toRef(source);
  const debounced = shallowRef(toValue(source)) as Ref<T>;

  const update = useDebounceFn(() => {
    debounced.value = reference.value;
  }, ms, options);

  watch(reference, () => {
    void update();
  });

  return shallowReadonly(debounced) as RefDebouncedReturn<T>;
}
