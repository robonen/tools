import { toValue } from 'vue';
import { omit } from '@robonen/stdlib';
import { reactiveComputed } from '@/composables/reactivity/reactiveComputed';

/**
 * Resolved type of `reactiveOmit`: a reactive object that drops either the
 * listed keys (`Omit`) or — when a predicate is used — an arbitrary subset
 * (`Partial`), since the kept keys are only known at runtime.
 */
export type ReactiveOmitReturn<
  T extends object,
  K extends keyof T | undefined = undefined,
>
  = [K] extends [undefined]
    ? Partial<T>
    : Omit<T, Extract<K, keyof T>>;

/**
 * Predicate deciding, per field, whether a key should be omitted.
 * Return `true` to drop the field.
 */
export type ReactiveOmitPredicate<T extends object>
  = (value: T[keyof T], key: keyof T) => boolean;

export function reactiveOmit<T extends object, K extends keyof T>(
  obj: T,
  ...keys: Array<K | K[]>
): ReactiveOmitReturn<T, K>;
export function reactiveOmit<T extends object>(
  obj: T,
  predicate: ReactiveOmitPredicate<T>,
): ReactiveOmitReturn<T>;

/**
 * @name reactiveOmit
 * @category Reactivity
 * @description Reactively omit keys from a reactive object or ref. Accepts a
 * variadic list of keys (mixing single keys and key arrays) or a predicate that
 * decides per field whether to drop it. The result is a reactive object backed
 * by a single cached `computed`, so reading one field tracks only that field and
 * the underlying selection is recomputed only when a dependency changes.
 *
 * Keys are removed via the stdlib `omit`, which builds the result without
 * `delete` (avoiding V8 dictionary-mode deopts on the kept object).
 *
 * @param {T} obj The source reactive object (or ref-bearing object) to omit from
 * @param {...(K | K[])[] | [ReactiveOmitPredicate<T>]} keys Keys to drop (single or arrays), or a single predicate
 * @returns {ReactiveOmitReturn<T, K>} A reactive object without the omitted fields
 *
 * @example
 * const state = reactive({ name: 'a', count: 1, hidden: true });
 * const visible = reactiveOmit(state, 'hidden');
 * visible; // reactive { name: 'a', count: 1 }
 *
 * @example
 * // mix single keys and arrays
 * const slim = reactiveOmit(state, 'hidden', ['count']);
 *
 * @example
 * // predicate: drop every boolean field
 * const noFlags = reactiveOmit(state, (value) => typeof value === 'boolean');
 *
 * @since 0.0.15
 */
export function reactiveOmit<T extends object, K extends keyof T>(
  obj: T,
  ...keys: Array<K | K[] | ReactiveOmitPredicate<T>>
): ReactiveOmitReturn<T, K> {
  const first = keys[0];
  const predicate = typeof first === 'function'
    ? first as ReactiveOmitPredicate<T>
    : undefined;

  // Flatten the variadic key list once, outside the reactive getter, so the
  // recompute below does not re-flatten on every dependency change.
  const flatKeys: K[] = predicate
    ? []
    : (keys as Array<K | K[]>).flat() as K[];

  if (predicate) {
    return reactiveComputed<Partial<T>>(() => {
      const source = toValue(obj) as T;
      const result = {} as Partial<T>;

      for (const key in source) {
        if (!Object.hasOwn(source, key))
          continue;

        const value = source[key];
        if (!predicate(value as T[keyof T], key as unknown as keyof T))
          result[key] = value;
      }

      return result;
    }) as ReactiveOmitReturn<T, K>;
  }

  return reactiveComputed<Omit<T, K>>(
    () => omit<T, K>(toValue(obj) as T, flatKeys),
  ) as ReactiveOmitReturn<T, K>;
}
