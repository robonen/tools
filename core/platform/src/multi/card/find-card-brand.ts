import { CARD_BRANDS } from './card-brands';
import type { CardBrand, CardPattern } from './card-brands';

interface RangeMeta {
  readonly width: number;
  readonly minString: string;
  readonly maxString: string;
}

// Precompute the constant string forms of every range pattern once, so the
// per-keystroke scan doesn't re-derive them via String() on each comparison.
const RANGE_META = new Map<CardPattern, RangeMeta>();
for (const brand of CARD_BRANDS) {
  for (const pattern of brand.patterns) {
    if (typeof pattern !== 'string') {
      const maxString = String(pattern[1]);
      RANGE_META.set(pattern, { width: maxString.length, minString: String(pattern[0]), maxString });
    }
  }
}

/**
 * Score how specifically `digits` matches a pattern: the number of leading digits
 * that match (higher = more specific), or `0` for no match. Supports partial
 * input as the user types.
 */
function patternScore(digits: string, pattern: CardPattern): number {
  if (typeof pattern === 'string') {
    const length = Math.min(pattern.length, digits.length);
    return digits.slice(0, length) === pattern.slice(0, length) ? length : 0;
  }

  const meta = RANGE_META.get(pattern);
  const maxString = meta ? meta.maxString : String(pattern[1]);
  const minString = meta ? meta.minString : String(pattern[0]);
  const width = meta ? meta.width : maxString.length;

  const prefix = digits.slice(0, width);
  const value = Number(prefix);
  const low = Number(minString.slice(0, prefix.length));
  const high = Number(maxString.slice(0, prefix.length));

  return value >= low && value <= high ? prefix.length : 0;
}

/**
 * @name findCardBrand
 * @category Multi
 * @description Detect a payment-card brand from a number's digits by its IIN/BIN
 * pattern. Returns the brand whose pattern matches the most leading digits (so it
 * narrows down as the user types), or `undefined` if none match. Pure.
 *
 * @param {string} digits The card number's digits (no separators)
 * @param {readonly CardBrand[]} [brands=CARD_BRANDS] The brand list
 * @returns {CardBrand | undefined} The detected brand, or `undefined`
 *
 * @example
 * findCardBrand('4111111111111111')?.brand; // 'visa'
 * findCardBrand('371449635398431')?.brand;   // 'american-express'
 * findCardBrand('2200123412341234')?.brand;  // 'mir'
 *
 * @since 0.0.5
 */
export function findCardBrand(
  digits: string,
  brands: readonly CardBrand[] = CARD_BRANDS,
): CardBrand | undefined {
  if (!digits)
    return undefined;

  let best: CardBrand | undefined;
  let bestScore = 0;

  for (const brand of brands) {
    for (const pattern of brand.patterns) {
      const score = patternScore(digits, pattern);
      if (score > bestScore) {
        best = brand;
        bestScore = score;
      }
    }
  }

  return best;
}
