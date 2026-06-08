import { reactive, toValue } from 'vue';
import type { UnwrapRef } from 'vue';
import { isFunction } from '@robonen/stdlib';

/**
 * The reactive object produced by {@link reactivePick}: a subset of `T`
 * restricted to the picked keys `K`, with each value unwrapped.
 */
export type ReactivePickReturn<T extends object, K extends keyof T>
  = { [Key in K]: UnwrapRef<T[Key]> };

/**
 * Predicate form: receive each `(value, key)` pair of the source object and
 * return `true` to keep the key in the resulting reactive view.
 */
export type ReactivePickPredicate<T extends object>
  = (value: T[keyof T], key: keyof T) => boolean;

/**
 * @name reactivePick
 * @category Reactivity
 * @description Reactively pick a subset of keys (or keys matched by a
 * predicate) from a reactive object. The result is a live `reactive` proxy:
 * reads forward to the source's current value (so it tracks reassignment of
 * nested refs) and writes pass straight back to the source. Unlike a
 * `computed` of an object literal, no new object is allocated per recompute —
 * the proxy is built once and lookups are resolved lazily on access.
 *
 * @param {T} obj The reactive source object (a `reactive`, `ref` value, or plain object)
 * @param {...((K | K[]))} keys One or more keys (or arrays of keys) to pick
 * @returns {ReactivePickReturn<T, K>} A reactive view limited to the picked keys
 *
 * @example
 * const state = reactive({ x: 1, y: 2, z: 3 });
 * const picked = reactivePick(state, 'x', 'y');
 * picked.x; // 1 — stays in sync with state.x
 * picked.x = 10; // writes back: state.x === 10
 *
 * @example
 * // predicate form — keep only numeric values
 * const filtered = reactivePick(state, (value) => typeof value === 'number');
 *
 * @since 0.0.15
 */
export function reactivePick<T extends object, K extends keyof T>(
  obj: T,
  ...keys: Array<K | K[]>
): ReactivePickReturn<T, K>;
export function reactivePick<T extends object>(
  obj: T,
  predicate: ReactivePickPredicate<T>,
): ReactivePickReturn<T, keyof T>;
export function reactivePick<T extends object, K extends keyof T>(
  obj: T,
  ...keys: Array<K | K[] | ReactivePickPredicate<T>>
): ReactivePickReturn<T, K> {
  const first = keys[0];

  // Predicate form: the set of kept keys is data-dependent, so it must be
  // evaluated on every key-set access (`ownKeys`/`has`/`get`). Value reads
  // still forward straight to the source, keeping the view reactive.
  if (isFunction(first)) {
    const predicate = first as ReactivePickPredicate<T>;
    const keeps = (key: PropertyKey): boolean =>
      key in obj && predicate(toValue((obj as Record<PropertyKey, unknown>)[key]) as T[keyof T], key as keyof T);

    return reactive(new Proxy({} as ReactivePickReturn<T, K>, {
      get(_, key, receiver) {
        return keeps(key) ? Reflect.get(obj, key, receiver) : undefined;
      },
      set(_, key, value) {
        return keeps(key) ? Reflect.set(obj as object, key, value) : true;
      },
      has(_, key) {
        return keeps(key);
      },
      ownKeys() {
        return Reflect.ownKeys(obj).filter(keeps);
      },
      getOwnPropertyDescriptor(_, key) {
        if (!keeps(key))
          return undefined;

        return { enumerable: true, configurable: true };
      },
    })) as ReactivePickReturn<T, K>;
  }

  // Key form: flatten the (possibly nested) key arguments into a stable Set
  // once at construction time, then resolve membership in O(1) per access.
  const picked = new Set<PropertyKey>((keys as Array<K | K[]>).flat());

  return reactive(new Proxy({} as ReactivePickReturn<T, K>, {
    get(_, key, receiver) {
      return picked.has(key) ? Reflect.get(obj, key, receiver) : undefined;
    },
    set(_, key, value) {
      return picked.has(key) ? Reflect.set(obj as object, key, value) : true;
    },
    has(_, key) {
      return picked.has(key) && key in obj;
    },
    ownKeys() {
      return Reflect.ownKeys(obj).filter(key => picked.has(key));
    },
    getOwnPropertyDescriptor(_, key) {
      if (!picked.has(key) || !(key in obj))
        return undefined;

      return { enumerable: true, configurable: true };
    },
  })) as ReactivePickReturn<T, K>;
}
