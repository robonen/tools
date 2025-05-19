export interface DebounceOptions {
    /**
     * Call the function on the leading edge of the timeout, instead of waiting for the trailing edge
     */
    readonly immediate?: boolean;

    /**
     * Call the function on the trailing edge with the last used arguments.
     * Result of call is from previous call
     */
    readonly trailing?: boolean;
}

const DEFAULT_DEBOUNCE_OPTIONS: DebounceOptions = {
    trailing: true,
}

export function debounce<FnArguments extends unknown[], FnReturn>(
    fn: (...args: FnArguments) => PromiseLike<FnReturn> | FnReturn,
    timeout: number = 20,
    options: DebounceOptions = {},
) {
    options = {
        ...DEFAULT_DEBOUNCE_OPTIONS,
        ...options,
    };

    if (!Number.isFinite(timeout) || timeout <= 0)
        throw new TypeError('Debounce timeout must be a positive number');

    // Last result for leading edge
    let leadingValue: PromiseLike<FnReturn> | FnReturn;
    
    // Debounce timeout id
    let timeoutId: NodeJS.Timeout;

    // Promises to be resolved when debounce is finished
    let resolveList: Array<(value: unknown) => void> = [];

    // State of currently resolving promise
    let currentResolve: Promise<FnReturn>;

    // Trailing call information
    let trailingArgs: unknown[];


}
