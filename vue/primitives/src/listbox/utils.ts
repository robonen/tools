export type ListboxValue = string | number | boolean | Record<string, unknown>;

export function compare<T>(
  a: T | undefined,
  b: T | undefined,
  by?: string | ((a: T, b: T) => boolean),
): boolean {
  if (a === undefined || b === undefined) return false;
  if (by === undefined) return a === b;
  if (typeof by === 'function') return by(a as T, b as T);
  // string key lookup
  return (a as any)?.[by] === (b as any)?.[by];
}

export function includes<T>(
  value: T | T[] | undefined,
  current: T,
  by?: string | ((a: T, b: T) => boolean),
): boolean {
  if (value === undefined) return false;
  if (!Array.isArray(value)) return compare(value, current, by);
  // manual loop avoids the per-call closure allocation of .some()
  for (const v of value) {
    if (compare(v, current, by)) return true;
  }
  return false;
}
