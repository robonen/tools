import { ref, watch, toValue, type MaybeRefOrGetter, type Ref, type WatchOptions } from 'vue';

export type Comparator<Value> = (a: Value, b: Value) => boolean;

/**
 * @name useCached
 * @category Reactivity
 * @description Caches the value of an external ref and updates it only when the value changes
 * 
 * @param {Ref<T>} externalValue Ref to cache
 * @param {Comparator<T>} comparator Comparator function to compare the values
 * @param {WatchOptions} watchOptions Watch options
 * @returns {Ref<T>} Cached ref
 * 
 * @example
 * const externalValue = ref(0);
 * const cachedValue = useCached(externalValue);
 * 
 * @example
 * const externalValue = ref(0);
 * const cachedValue = useCached(externalValue, (a, b) => a === b, { immediate: true });
 * 
 * @since 0.0.1
 */
export function useCached<Value = unknown>(
    externalValue: MaybeRefOrGetter<Value>,
    comparator: Comparator<Value> = (a, b) => a === b,
    watchOptions?: WatchOptions,
): Ref<Value> {
    const cached = ref(toValue(externalValue)) as Ref<Value>;

    watch(() => toValue(externalValue), (value) => {
        if (!comparator(value, cached.value))
            cached.value = value;
    }, watchOptions);

    return cached;
}