import { isArray, type Arrayable } from '../../types';

/**
 * @name pick
 * @category Objects
 * @description Returns a partial copy of an object containing only the keys specified
 * 
 * @param {object} target - The object to pick keys from
 * @param {Arrayable<keyof Target>} keys - The keys to pick
 * @returns {Pick<Target, Key>} The new object with the specified keys picked
 * 
 * @example
 * pick({ a: 1, b: 2, c: 3 }, 'a') // => { a: 1 }
 * 
 * @example
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'b']) // => { a: 1, b: 2 }
 * 
 * @since 0.0.3
 */
export function pick<Target extends object, Key extends keyof Target>(
  target: Target,
  keys: Arrayable<Key>
): Pick<Target, Key> {
  const result = {} as Pick<Target, Key>;

  if (!target || !keys)
    return result;

  if (isArray(keys)) {
    for (const key of keys) {
      result[key] = target[key];
    }
  } else {
    result[keys] = target[keys];
  }

  return result;
}