import { timestamp } from '@robonen/stdlib';
import { ref, watch, type WatchSource, type WatchOptions, type Ref } from 'vue';

export interface UseLastChangedOptions<
  Immediate extends boolean,
  InitialValue extends number | null | undefined = undefined,
> extends WatchOptions<Immediate> {
  initialValue?: InitialValue;
}

/**
 * @name useLastChanged
 * @category State
 * @description Records the last time a value changed
 * 
 * @param {WatchSource} source The value to track
 * @param {UseLastChangedOptions} [options={}] The options for the last changed tracker
 * @returns {Ref<number | null>} The timestamp of the last change
 * 
 * @example
 * const value = ref(0);
 * const lastChanged = useLastChanged(value);
 * 
 * @example
 * const value = ref(0);
 * const lastChanged = useLastChanged(value, { immediate: true });
 */
export function useLastChanged(source: WatchSource, options?: UseLastChangedOptions<false>): Ref<number | null>;
export function useLastChanged(source: WatchSource, options: UseLastChangedOptions<true> | UseLastChangedOptions<boolean, number>): Ref<number>
export function useLastChanged(source: WatchSource, options: UseLastChangedOptions<boolean, any> = {}): Ref<number | null> | Ref<number> {
  const lastChanged = ref<number | null>(options.initialValue ?? null);

  watch(source, () => lastChanged.value = timestamp(), options);

  return lastChanged;
}
