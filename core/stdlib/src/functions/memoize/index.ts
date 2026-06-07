import type { AnyFunction } from '../../types';

export type MemoizeResolver<T extends AnyFunction> = (...args: Parameters<T>) => unknown;

export type MemoizedFunction<T extends AnyFunction> = T & {
  /** The underlying cache, keyed by the resolver (first argument by default). */
  cache: Map<unknown, ReturnType<T>>;
  /** Drop all cached results. */
  clear: () => void;
};

/**
 * @name memoize
 * @category Functions
 * @description Caches the result of a function by its arguments
 *
 * @param {Function} fn - The function to memoize
 * @param {Function} [resolver] - Maps the arguments to a cache key; defaults to the first argument
 * @returns {MemoizedFunction} The memoized function, exposing its `cache` and a `clear()` method
 *
 * @example
 * const slow = memoize((n: number) => expensive(n));
 * slow(2); // computed
 * slow(2); // cached
 *
 * @example
 * const sum = memoize((a: number, b: number) => a + b, (a, b) => `${a},${b}`);
 *
 * @since 0.0.10
 */
export function memoize<T extends AnyFunction>(fn: T, resolver?: MemoizeResolver<T>): MemoizedFunction<T> {
  const cache = new Map<unknown, ReturnType<T>>();

  const memoized = function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const key = resolver ? resolver(...args) : args[0];

    if (cache.has(key))
      return cache.get(key)!;

    const result = fn.apply(this, args) as ReturnType<T>;
    cache.set(key, result);

    return result;
  } as MemoizedFunction<T>;

  memoized.cache = cache;
  memoized.clear = () => cache.clear();

  return memoized;
}
