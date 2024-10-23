import { clamp, isFunction } from '@robonen/stdlib';
import { computed, isReadonly, ref, toValue, type ComputedRef, type MaybeRef, type MaybeRefOrGetter, type WritableComputedRef } from 'vue';

/**
 * @name useClamp
 * @category Math
 * @description Clamps a value between a minimum and maximum value
 * 
 * @param {MaybeRefOrGetter<number>} value The value to clamp
 * @param {MaybeRefOrGetter<number>} min The minimum value
 * @param {MaybeRefOrGetter<number>} max The maximum value
 * @returns {ComputedRef<number>} The clamped value
 * 
 * @example
 * const value = ref(10);
 * const clampedValue = useClamp(value, 0, 5);
 * 
 * @example
 * const value = ref(10);
 * const clampedValue = useClamp(value, () => 0, () => 5);
 * 
 * @since 0.0.1
 */
export function useClamp(value: MaybeRef<number>, min: MaybeRefOrGetter<number>, max: MaybeRefOrGetter<number>): WritableComputedRef<number>;
export function useClamp(value: MaybeRefOrGetter<number>, min: MaybeRefOrGetter<number>, max: MaybeRefOrGetter<number>): ComputedRef<number> {
  if (isFunction(value) || isReadonly(value))
    return computed(() => clamp(toValue(value), toValue(min), toValue(max)));

  const _value = ref(value);

  return computed<number>({
    get() {
      return clamp(_value.value, toValue(min), toValue(max));
    },
    set(newValue) {
      _value.value = clamp(newValue, toValue(min), toValue(max));
    },
  });
}
