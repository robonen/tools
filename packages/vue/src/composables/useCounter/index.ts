import { ref, unref, type MaybeRef } from 'vue';
import { clamp } from '@robonen/stdlib';

export interface UseCounterOptions {
    min?: number;
    max?: number;
}

/**
 * @name useCounter
 * @category Utilities
 * @description A composable that provides a counter with increment, decrement, set, get, and reset functions
 * 
 * @param {MaybeRef<number>} [initialValue=0] The initial value of the counter
 * @param {UseCounterOptions} [options={}] The options for the counter
 * @param {number} [options.min=Number.MIN_SAFE_INTEGER] The minimum value of the counter
 * @param {number} [options.max=Number.MAX_SAFE_INTEGER] The maximum value of the counter
 * 
 * @example
 * const { count, increment } = useCounter(0);
 * 
 * @example
 * const { count, increment, decrement, set, get, reset } = useCounter(0, { min: 0, max: 10 });
 */
export function useCounter(initialValue: MaybeRef<number> = 0, options: UseCounterOptions = {}) {
    let _initialValue = unref(initialValue);
    const count = ref(initialValue);

    const {
        min = Number.MIN_SAFE_INTEGER,
        max = Number.MAX_SAFE_INTEGER,
    } = options;

    const increment = (delta = 1) =>
        count.value = clamp(count.value + delta, min, max);

    const decrement = (delta = 1) =>
        count.value = clamp(count.value - delta, min, max);

    const set = (value: number) =>
        count.value = clamp(value, min, max);

    const get = () => count.value;

    const reset = (value = _initialValue) => {
        _initialValue = value;
        return set(value);
    };

    return {
        count,
        increment,
        decrement,
        set,
        get,
        reset,
    };
};
