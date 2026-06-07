import type { Collection, Path } from '../../types';

export type ExtractFromObject<O extends Record<PropertyKey, unknown>, K>
  = K extends keyof O
    ? O[K]
    : K extends keyof NonNullable<O>
      ? NonNullable<O>[K]
      : never;

export type ExtractFromArray<A extends readonly any[], K>
  = any[] extends A
    ? A extends ReadonlyArray<infer T>
      ? T | undefined
      : undefined
    : K extends keyof A
      ? A[K]
      : undefined;

export type ExtractFromCollection<O, K>
  = K extends []
    ? O
    : K extends [infer Key, ...infer Rest]
      ? O extends Record<PropertyKey, unknown>
        ? ExtractFromCollection<ExtractFromObject<O, Key>, Rest>
        : O extends readonly any[]
          ? ExtractFromCollection<ExtractFromArray<O, Key>, Rest>
          : never
      : never;

export type Get<O, K> = ExtractFromCollection<O, Path<K>>;

/**
 * @name get
 * @category Collections
 * @description Safely read a deeply nested value from a collection by a dot-separated path
 *
 * @param {Collection} obj - The source object or array
 * @param {string} path - Dot-separated path, e.g. `'user.addresses.0.street'`
 * @returns {Get<O, K> | undefined} The resolved value, or `undefined` if any segment is missing
 *
 * @example
 * get({ user: { name: 'John' } }, 'user.name'); // 'John'
 * get({ items: [{ id: 1 }] }, 'items.0.id'); // 1
 * get({ a: 1 }, 'a.b.c'); // undefined
 *
 * @since 0.0.4
 */
export function get<O extends Collection, K extends string>(obj: O, path: K): Get<O, K> | undefined {
  let value: any = obj;
  let start = 0;

  // Walk the path without allocating an intermediate array of segments.
  for (let i = 0, len = path.length; i <= len; i++) {
    // Split on '.' (char code 46) or the end of the string.
    if (i !== len && path.charCodeAt(i) !== 46)
      continue;

    if (value === null || value === undefined)
      return undefined;

    value = value[path.slice(start, i)];
    start = i + 1;
  }

  return value;
}
