import { luhn } from '@robonen/encoding';
import { CARD_BRANDS } from './card-brands';
import type { CardBrand } from './card-brands';
import { findCardBrand } from './find-card-brand';

const NON_DIGIT = /\D/g;

/**
 * @name isValidCardNumber
 * @category Multi
 * @description Whether `value` is a complete, valid payment-card number: it passes
 * the Luhn checksum (`luhn` from `@robonen/encoding`) AND its digit length matches
 * the detected {@link findCardBrand} brand (or the 12–19 digit ISO/IEC 7812 range
 * when the brand is unknown). For the bare checksum, use `luhn` directly.
 *
 * @param {string} value The card number (separators allowed)
 * @param {readonly CardBrand[]} [brands=CARD_BRANDS] The brand list
 * @returns {boolean} Whether the number is structurally valid
 *
 * @example
 * isValidCardNumber('4111 1111 1111 1111'); // true
 * isValidCardNumber('4111 1111 1111');      // false (wrong length)
 *
 * @since 0.0.5
 */
export function isValidCardNumber(value: string, brands: readonly CardBrand[] = CARD_BRANDS): boolean {
  if (!luhn(value))
    return false;

  const digits = value.replaceAll(NON_DIGIT, '');
  const brand = findCardBrand(digits, brands);

  return brand
    ? brand.lengths.includes(digits.length)
    : digits.length >= 12 && digits.length <= 19;
}
