import type { AnyFunction } from '../../types';

export type OnceFunction<T extends AnyFunction> = T & {
  /** Reset the guard so the next call runs the original function again. */
  clear: () => void;
};

/**
 * @name once
 * @category Functions
 * @description Wraps a function so it runs at most once; subsequent calls return the first result
 *
 * @param {Function} fn - The function to guard
 * @returns {OnceFunction} The guarded function with a `clear()` method to reset it
 *
 * @example
 * const init = once(() => Math.random());
 * init(); // 0.42
 * init(); // 0.42 (cached)
 * init.clear();
 * init(); // 0.91 (runs again)
 *
 * @since 0.0.10
 */
export function once<T extends AnyFunction>(fn: T): OnceFunction<T> {
  let called = false;
  let result: ReturnType<T>;

  const onced = function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    if (!called) {
      // Arm the guard only after a successful call, so a throwing first call stays
      // retryable (matching memoize) instead of permanently latching `undefined`.
      result = fn.apply(this, args);
      called = true;
    }

    return result;
  } as OnceFunction<T>;

  onced.clear = () => {
    called = false;
    // Release the cached result so it (and anything it retains) can be GC'd.
    result = undefined as ReturnType<T>;
  };

  return onced;
}
