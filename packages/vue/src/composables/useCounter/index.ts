import { ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import { clamp } from '@robonen/stdlib';

export interface UseCounterOptions {
    min?: number;
    max?: number;
}

export interface UseConterReturn {
    count: Ref<number>;
    increment: (delta?: number) => void;
    decrement: (delta?: number) => void;
    set: (value: number) => void;
    get: () => number;
    reset: (value?: number) => void;
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
 * @returns {UseConterReturn} The counter object
 * 
 * @example
 * const { count, increment } = useCounter(0);
 * 
 * @example
 * const { count, increment, decrement, set, get, reset } = useCounter(0, { min: 0, max: 10 });
 */
export function useCounter(
    initialValue: MaybeRefOrGetter<number> = 0,
    options: UseCounterOptions = {},
): UseConterReturn {
    let _initialValue = toValue(initialValue);
    const count = ref(_initialValue);

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
