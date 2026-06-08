import { isArray } from '../../types';
import type { Arrayable } from '../../types';

/**
 * @name omit
 * @category Objects
 * @description Returns a new object with the specified keys omitted
 *
 * @param {object} target - The object to omit keys from
 * @param {Arrayable<keyof Target>} keys - The keys to omit
 * @returns {Omit<Target, Key>} The new object with the specified keys omitted
 *
 * @example
 * omit({ a: 1, b: 2, c: 3 }, 'a') // => { b: 2, c: 3 }
 *
 * @example
 * omit({ a: 1, b: 2, c: 3 }, ['a', 'b']) // => { c: 3 }
 *
 * @since 0.0.3
 */
export function omit<Target extends object, Key extends keyof Target>(
  target: Target,
  keys: Arrayable<Key>,
): Omit<Target, Key> {
  const result = {} as Omit<Target, Key>;

  if (!target)
    return result;

  // Build the kept-keys object directly instead of spread-then-delete: `delete` forces V8
  // to drop the object into slow dictionary mode, penalizing all later property access.
  const omitted = new Set<PropertyKey>(
    keys === null || keys === undefined ? [] : isArray(keys) ? keys : [keys],
  );

  for (const key in target) {
    if (Object.hasOwn(target, key) && !omitted.has(key))
      (result as Record<PropertyKey, unknown>)[key] = target[key];
  }

  return result;
}
