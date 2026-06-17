import { CARD_BRANDS, findCardBrand } from '@robonen/platform/multi';
import type { CardBrand } from '@robonen/platform/multi';
import type { MaskOptions } from '../types';
import { createDynamicMask } from './dynamic';

// Re-export the platform reference data + resolver + validator (source of truth
// lives in `@robonen/platform`; the Luhn primitive lives in `@robonen/encoding`).
export { CARD_BRANDS, findCardBrand, isValidCardNumber } from '@robonen/platform/multi';
export type { CardBrand } from '@robonen/platform/multi';

const DEFAULT_CARD_FALLBACK = '#### #### #### ####';

/**
 * Parameters for {@link maskCardOptions}.
 */
export interface MaskCardParams {
  /**
   * Known card brands, matched by {@link findCardBrand}.
   *
   * @default CARD_BRANDS
   */
  readonly brands?: readonly CardBrand[];
  /**
   * Template used before a brand is recognized (and for unknown brands).
   *
   * @default '#### #### #### ####'
   */
  readonly fallback?: string;
  /**
   * Token map applied to every template.
   */
  readonly tokens?: Readonly<Record<string, RegExp>>;
}

/**
 * @name maskCardOptions
 * @category Forms
 * @description A dynamic payment-card mask that groups digits by the detected
 * brand. The mask is a function of state: it reads the digits, resolves the brand
 * via {@link findCardBrand} (by IIN/BIN prefix), and applies that brand's grouping
 * template (e.g. `#### ###### #####` for Amex) — falling back to a generic 16-digit
 * grouping until a brand is recognized. The unmasked value is the digit string.
 *
 * @param {MaskCardParams} [params={}] Brands and fallback template
 * @returns {MaskOptions} Ready-to-use mask options (a function mask)
 *
 * @example
 * const card = useMaskedInput({ mask: maskCardOptions() });
 * // <input v-bind="card.bind">  — 4111… → '4111 1111 1111 1111', 3714… → Amex 4-6-5
 *
 * @since 0.0.14
 */
export function maskCardOptions(params: MaskCardParams = {}): MaskOptions {
  const brands = params.brands ?? CARD_BRANDS;
  const fallback = params.fallback ?? DEFAULT_CARD_FALLBACK;

  return createDynamicMask(
    digits => findCardBrand(digits, brands)?.template ?? fallback,
    fallback,
    params.tokens,
  );
}
