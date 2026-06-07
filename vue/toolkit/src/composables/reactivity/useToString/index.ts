import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * @name useToString
 * @category Reactivity
 * @description Reactively stringify a value, equivalent to `computed(() => String(toValue(value)))`.
 *
 * @param {MaybeRefOrGetter<unknown>} value The source value (can be a ref, getter, or plain value)
 * @returns {ComputedRef<string>} The string representation of the value
 *
 * @example
 * const count = ref(42);
 * const str = useToString(count); // '42'
 *
 * @example
 * // works with getters
 * const label = useToString(() => `item-${id.value}`);
 *
 * @since 0.0.15
 */
export function useToString(
  value: MaybeRefOrGetter<unknown>,
): ComputedRef<string> {
  return computed<string>(() => `${toValue(value)}`);
}
