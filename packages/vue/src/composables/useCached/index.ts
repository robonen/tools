import { ref, watch, type Ref, type WatchOptions } from 'vue';

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
 */
export function useCached<Value = unknown>(
    externalValue: Ref<Value>,
    comparator: Comparator<Value> = (a, b) => a === b,
    watchOptions?: WatchOptions,
): Ref<Value> {
    const cached = ref(externalValue.value) as Ref<Value>;

    watch(() => externalValue.value, (value) => {
        if (!comparator(value, cached.value))
            cached.value = value;
    }, watchOptions);

    return cached;
}