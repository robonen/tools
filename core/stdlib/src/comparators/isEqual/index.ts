function equals(a: any, b: any, seen: WeakMap<object, unknown>): boolean {
  if (a === b)
    return true;

  // NaN is the only value not equal to itself; treat NaN === NaN.
  if (typeof a === 'number' && typeof b === 'number')
    return Number.isNaN(a) && Number.isNaN(b);

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object')
    return false;

  // Cycle guard: if we have already paired `a`, it must pair with the same `b`.
  const paired = seen.get(a);
  if (paired !== undefined)
    return paired === b;
  seen.set(a, b);

  if (a instanceof Date || b instanceof Date)
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();

  if (a instanceof RegExp || b instanceof RegExp)
    return a instanceof RegExp && b instanceof RegExp && a.source === b.source && a.flags === b.flags;

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray || bIsArray) {
    if (!aIsArray || !bIsArray || a.length !== b.length)
      return false;

    for (let i = 0; i < a.length; i++) {
      if (!equals(a[i], b[i], seen))
        return false;
    }

    return true;
  }

  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size)
      return false;

    for (const [key, value] of a) {
      if (!b.has(key) || !equals(value, b.get(key), seen))
        return false;
    }

    return true;
  }

  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set) || !(b instanceof Set) || a.size !== b.size)
      return false;

    for (const value of a) {
      if (!b.has(value))
        return false;
    }

    return true;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length)
    return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !equals(a[key], b[key], seen))
      return false;
  }

  return true;
}

/**
 * @name isEqual
 * @category Comparators
 * @description Deep structural equality between two values. Handles primitives
 * (NaN-aware), `Date`, `RegExp`, arrays, `Map`, `Set`, and plain objects, and is
 * safe against circular references. `Set` membership is compared shallowly.
 *
 * @param {unknown} a - The first value
 * @param {unknown} b - The second value
 * @returns {boolean} `true` if the values are deeply equal
 *
 * @example
 * isEqual({ a: [1, 2] }, { a: [1, 2] }); // true
 * isEqual([1, { b: 2 }], [1, { b: 3 }]); // false
 * isEqual(Number.NaN, Number.NaN); // true
 *
 * @since 0.0.10
 */
export function isEqual(a: unknown, b: unknown): boolean {
  return equals(a, b, new WeakMap());
}
