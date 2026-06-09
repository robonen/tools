const NON_DIGIT = /\D/g;
const ASCII_ZERO = 0x30;

/**
 * @name luhn
 * @category Encoding
 * @description Validate a number string against the Luhn (mod 10) checksum — the
 * check digit used by payment cards, IMEIs, SIM ICCIDs, and more. Non-digits are
 * ignored; an empty input is `false`.
 *
 * @param {string} value The number (separators allowed)
 * @returns {boolean} Whether the Luhn checksum passes
 *
 * @example
 * luhn('4111 1111 1111 1111'); // true
 * luhn('4111 1111 1111 1112'); // false
 *
 * @since 0.0.2
 */
export function luhn(value: string): boolean {
  const digits = value.replaceAll(NON_DIGIT, '');
  if (!digits)
    return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits.charCodeAt(i) - ASCII_ZERO;
    if (double) {
      digit *= 2;
      if (digit > 9)
        digit -= 9;
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}
