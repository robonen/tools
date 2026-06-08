import type { Ref } from 'vue';

/**
 * @name set
 * @category Utilities
 * @description Shorthand setter that mirrors {@link get}. Either assigns `value` to a
 * ref (`ref.value = value`) or assigns `value` to a single property of an object
 * (`target[key] = value`). The arity is resolved at the type level via overloads, so
 * both forms stay fully type-safe. Purely synchronous and side-effect free, so it is
 * fully SSR-safe.
 *
 * @param {Ref<T> | O} target The ref to write to, or the object to mutate
 * @param {T | K} valueOrKey The value to assign to the ref, or the key to mutate
 * @param {O[K]} [value] The value to assign to `target[key]` in the three-argument form
 * @returns {void}
 *
 * @example
 * const count = ref(0);
 * set(count, 5); // count.value === 5
 *
 * @example
 * const user = reactive({ name: 'Ada' });
 * set(user, 'name', 'Grace'); // user.name === 'Grace'
 *
 * @since 0.0.15
 */
export function set<T>(ref: Ref<T>, value: T): void;
export function set<O extends object, K extends keyof O>(target: O, key: K, value: O[K]): void;
export function set<O extends object, K extends keyof O>(
  target: Ref<unknown> | O,
  valueOrKey: K | unknown,
  value?: O[K],
): void {
  if (arguments.length === 2) {
    (target as Ref<unknown>).value = valueOrKey;
    return;
  }

  (target as O)[valueOrKey as K] = value as O[K];
}
