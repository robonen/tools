import type { Collection } from '../../types';

// Hoisted so it is compiled once rather than re-created on each `set` call.
const NUMERIC_SEGMENT = /^\d+$/;

/**
 * @name set
 * @category Collections
 * @description Write a deeply nested value into a collection by a dot-separated path,
 * creating any missing intermediate containers along the way. A numeric next segment
 * creates an array, otherwise an object. Mutates and returns the original collection.
 *
 * @param {Collection} obj - The target object or array (mutated in place)
 * @param {string} path - Dot-separated path, e.g. `'user.addresses.0.street'`
 * @param {unknown} value - The value to assign at the path
 * @returns {Collection} The same `obj`, for chaining
 *
 * @example
 * set({ user: { name: 'John' } }, 'user.name', 'Jane'); // { user: { name: 'Jane' } }
 * set({}, 'items.0.id', 1); // { items: [{ id: 1 }] }
 *
 * @since 0.0.10
 */
export function set<O extends Collection>(obj: O, path: string, value: unknown): O {
  if (path === '')
    return obj;

  const keys = path.split('.');
  const lastKey = keys[keys.length - 1]!;
  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    const next = current[key];

    // Create the missing intermediate: an array when the next segment is a numeric
    // index, otherwise a plain object.
    if (next === null || typeof next !== 'object')
      current[key] = NUMERIC_SEGMENT.test(keys[i + 1]!) ? [] : {};

    current = current[key];
  }

  current[lastKey] = value;

  return obj;
}
