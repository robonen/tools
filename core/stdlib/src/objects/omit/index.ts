import { isArray, type Arrayable } from '../../types';

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
  keys: Arrayable<Key>
): Omit<Target, Key> {
  const result = { ...target };

  if (!target || !keys)
    return result;

  if (isArray(keys)) {
    for (const key of keys) {
      delete result[key];
    }
  } else {
    delete result[keys];
  }

  return result;
}
