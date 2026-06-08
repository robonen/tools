import { shallowReactive } from 'vue';
import { memoize } from '@robonen/stdlib';

/**
 * The type of the key used to index the cache. Defaults to a serialized string
 * but may be any value when a custom `getKey` is supplied.
 */
export type MemoizeCacheKey = PropertyKey;

/**
 * Pluggable cache backend. Any object implementing this shape can be supplied
 * via `options.cache` to control storage (e.g. an LRU cache). When omitted a
 * plain `Map` is used and the heavy lifting is delegated to `@robonen/stdlib`'s
 * `memoize`.
 */
export interface UseMemoizeCache<Key, Value> {
  /**
   * Read the cached value for `key`, or `undefined` when absent.
   */
  get: (key: Key) => Value | undefined;

  /**
   * Store `value` under `key`.
   */
  set: (key: Key, value: Value) => void;

  /**
   * Whether a value is cached for `key`.
   */
  has: (key: Key) => boolean;

  /**
   * Drop the cached value for `key`.
   */
  delete: (key: Key) => void;

  /**
   * Drop every cached value.
   */
  clear: () => void;
}

export interface UseMemoizeOptions<Result, Args extends unknown[]> {
  /**
   * Derive the cache key from the call arguments. When omitted the arguments
   * are serialized with `JSON.stringify`, which matches by value rather than by
   * reference.
   *
   * @default (...args) => JSON.stringify(args)
   */
  getKey?: (...args: Args) => MemoizeCacheKey;

  /**
   * A custom cache backend. When supplied it is wrapped in `shallowReactive`
   * so reads inside effects re-run as the cache mutates.
   *
   * @default new Map()
   */
  cache?: UseMemoizeCache<MemoizeCacheKey, Result>;
}

export interface UseMemoizeReturn<Result, Args extends unknown[]> {
  /**
   * Return the cached result for `args`, computing and caching it on a miss.
   */
  (...args: Args): Result;

  /**
   * Recompute the result for `args` and overwrite the cache, bypassing any hit.
   * Use this to refresh stale data.
   */
  load: (...args: Args) => Result;

  /**
   * Drop the cached result for `args`.
   */
  delete: (...args: Args) => void;

  /**
   * Drop every cached result.
   */
  clear: () => void;

  /**
   * Compute the cache key for `args` without touching the cache.
   */
  generateKey: (...args: Args) => MemoizeCacheKey;

  /**
   * The reactive cache backend. Mutations are tracked, so reading from it
   * inside a `computed`/`watchEffect` re-evaluates as entries change.
   */
  cache: UseMemoizeCache<MemoizeCacheKey, Result>;
}

const defaultKey = (...args: unknown[]): MemoizeCacheKey => JSON.stringify(args);

/**
 * @name useMemoize
 * @category Utilities
 * @description Cache the result of a (possibly async) function by its arguments,
 * exposing a reactive cache and explicit `load`/`delete`/`clear`/`generateKey`
 * controls. When no custom `cache` is supplied the default `Map` path delegates
 * to `@robonen/stdlib`'s `memoize` for the get-or-compute core and is wrapped in
 * `shallowReactive` so cache reads inside effects stay live. A custom cache
 * backend (e.g. an LRU) can be plugged in via `options.cache`. SSR-safe: no
 * browser globals are touched.
 *
 * @param {(...args: Args) => Result} resolver The function whose results are cached (sync or async)
 * @param {UseMemoizeOptions<Result, Args>} [options] Custom `getKey` and/or `cache` backend
 * @returns {UseMemoizeReturn<Result, Args>} A callable memoized function with `load`, `delete`, `clear`, `generateKey`, and the reactive `cache`
 *
 * @example
 * const getUser = useMemoize(async (id: number) => fetch(`/users/${id}`).then(r => r.json()));
 * const a = await getUser(1); // network call
 * const b = await getUser(1); // cached, same promise
 * await getUser.load(1);      // force refresh
 * getUser.delete(1);          // evict one
 * getUser.clear();            // evict all
 *
 * @example
 * // Custom key + reactive cache size in a computed
 * const square = useMemoize((n: number) => n * n, { getKey: n => n });
 * const size = computed(() => (square.cache as Map<number, number>).size);
 *
 * @since 0.0.15
 */
export function useMemoize<Result, Args extends unknown[]>(
  resolver: (...args: Args) => Result,
  options?: UseMemoizeOptions<Result, Args>,
): UseMemoizeReturn<Result, Args> {
  const generateKey = (options?.getKey ?? defaultKey) as (...args: Args) => MemoizeCacheKey;

  // Default path: reuse stdlib `memoize` to build the typed backing `Map` (and
  // its key-resolver wiring). Custom backends skip this. Either way the cache is
  // wrapped in `shallowReactive` and the get-or-compute runs *through* the proxy
  // so reads inside effects track mutations — stdlib's own callable writes to the
  // raw Map and would bypass reactivity, so we drive the proxy ourselves.
  const cache = shallowReactive(
    options?.cache ?? memoize(resolver as (...a: Args) => Result, generateKey).cache,
  ) as UseMemoizeCache<MemoizeCacheKey, Result>;

  const load = (...args: Args): Result => {
    const key = generateKey(...args);
    const result = resolver(...args);
    cache.set(key, result);
    return result;
  };

  const get = (...args: Args): Result => {
    const key = generateKey(...args);

    if (cache.has(key))
      return cache.get(key) as Result;

    return load(...args);
  };

  const remove = (...args: Args): void => {
    cache.delete(generateKey(...args));
  };

  const clear = (): void => {
    cache.clear();
  };

  return Object.assign(get, {
    load,
    delete: remove,
    clear,
    generateKey,
    cache,
  }) as UseMemoizeReturn<Result, Args>;
}
