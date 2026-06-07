/**
 * Fractional indexing: generate string "order keys" so an element can be placed
 * strictly between two neighbors with a single key, and re-ordered (moved) by
 * just changing its key — without touching anything else. The digit alphabet is
 * ASCII-ascending, so JavaScript string comparison matches digit order.
 */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function midpoint(a: string, b: string): string {
  if (b !== '' && a >= b)
    throw new Error(`fractional-index: lower '${a}' must be < upper '${b}'`);

  let result = '';
  let i = 0;
  let upper = b;

  for (;;) {
    const x = i < a.length ? DIGITS.indexOf(a[i]!) : 0;
    const y = upper !== '' && i < upper.length ? DIGITS.indexOf(upper[i]!) : DIGITS.length;

    if (x === y) {
      result += DIGITS[x]!;
      i += 1;
      continue;
    }

    const mid = x + Math.floor((y - x) / 2);
    if (mid !== x)
      return result + DIGITS[mid]!;

    // Digits are adjacent — keep the lower digit and open the upper bound.
    result += DIGITS[x]!;
    i += 1;
    upper = '';
  }
}

/** A key strictly between `lower` and `upper` (`null` = open bound). */
export function keyBetween(lower: string | null, upper: string | null): string {
  return midpoint(lower ?? '', upper ?? '');
}

/** `n` keys strictly between `lower` and `upper`, in ascending order. */
export function keysBetween(lower: string | null, upper: string | null, n: number): string[] {
  if (n <= 0)
    return [];
  if (n === 1)
    return [keyBetween(lower, upper)];

  const mid = keyBetween(lower, upper);
  const left = keysBetween(lower, mid, Math.floor((n - 1) / 2));
  const right = keysBetween(mid, upper, n - 1 - left.length);
  return [...left, mid, ...right];
}
