import { isRef, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref, WatchOptions } from 'vue';
import { isFunction } from '@robonen/stdlib';

export type CloneFn<Source, Target = Source> = (source: Source) => Target;

export interface UseClonedOptions<T = unknown> extends WatchOptions {
  /**
   * Custom clone function.
   *
   * By default uses `structuredClone` when available, falling back to
   * `JSON.parse(JSON.stringify(value))`.
   */
  clone?: CloneFn<T>;

  /**
   * Manually sync the cloned ref instead of watching the source.
   *
   * @default false
   */
  manual?: boolean;
}

export interface UseClonedReturn<T> {
  /**
   * The cloned, mutable ref.
   */
  cloned: Ref<T>;

  /**
   * Whether the cloned data has been modified since the last sync.
   */
  isModified: Ref<boolean>;

  /**
   * Sync the cloned data with the source manually.
   */
  sync: () => void;
}

/**
 * Default clone implementation. Prefers the structured clone algorithm and
 * falls back to a JSON round-trip when `structuredClone` is unavailable
 * (older runtimes / SSR) or the value is not structured-cloneable.
 */
export function cloneFnDefault<T>(source: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(source);
    }
    catch {
      // value contains functions, symbols, etc. — fall back to JSON.
    }
  }

  return JSON.parse(JSON.stringify(source)) as T;
}

/**
 * @name useCloned
 * @category Reactivity
 * @description Reactive deep clone of a source with a mutable cloned ref, modification tracking, and manual mode.
 *
 * @param {MaybeRefOrGetter<T>} source The reactive source to clone (ref, getter, or plain value)
 * @param {UseClonedOptions<T>} [options={}] Options: `clone`, `manual`, and watch options (`deep`, `immediate`, `flush`)
 * @returns {UseClonedReturn<T>} The cloned ref, an `isModified` flag, and a `sync` function
 *
 * @example
 * const original = ref({ count: 0 });
 * const { cloned, isModified, sync } = useCloned(original);
 * cloned.value.count = 1; // isModified.value === true
 * sync(); // re-clone from source, isModified.value === false
 *
 * @example
 * const { cloned, sync } = useCloned(source, { manual: true });
 * // cloned only updates when sync() is called
 *
 * @since 0.0.15
 */
export function useCloned<T>(
  source: MaybeRefOrGetter<T>,
  options: UseClonedOptions<T> = {},
): UseClonedReturn<T> {
  const cloned = ref<T>() as Ref<T>;
  const isModified = ref(false);
  let lastSync = false;

  const {
    manual,
    clone = cloneFnDefault,
    deep = true,
    immediate = true,
  } = options;

  function sync(): void {
    lastSync = true;
    isModified.value = false;
    cloned.value = clone(toValue(source));
  }

  watch(cloned, () => {
    if (lastSync) {
      lastSync = false;
      return;
    }

    isModified.value = true;
  }, {
    deep: true,
    flush: 'sync',
  });

  if (!manual && (isRef(source) || isFunction(source))) {
    watch(source, sync, {
      ...options,
      deep,
      immediate,
    });
  }
  else {
    sync();
  }

  return { cloned, isModified, sync };
}
