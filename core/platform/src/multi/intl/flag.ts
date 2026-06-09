// Offset from an ASCII uppercase letter to its Unicode regional indicator
// symbol: 'A' (U+0041) → 🇦 (U+1F1E6).
const REGIONAL_INDICATOR_OFFSET = 0x1F1E6 - 'A'.charCodeAt(0);
const ALPHA2 = /^[a-z]{2}$/i;

/**
 * @name getCountryFlagByCode
 * @category Multi
 * @description Convert an ISO 3166-1 alpha-2 country code (e.g. `'RU'`, `'us'`)
 * into its flag emoji by mapping each letter to a Unicode regional indicator
 * symbol. Case-insensitive; returns an empty string for anything that isn't two
 * ASCII letters. Pure and environment-agnostic.
 *
 * @param {string} code The ISO 3166-1 alpha-2 code, e.g. `'US'`
 * @returns {string} The flag emoji (e.g. `'🇺🇸'`), or `''` when the code is invalid
 *
 * @example
 * getCountryFlagByCode('RU'); // '🇷🇺'
 * getCountryFlagByCode('us'); // '🇺🇸'
 * getCountryFlagByCode('123'); // ''
 *
 * @since 0.0.5
 */
export function getCountryFlagByCode(code: string): string {
  if (!ALPHA2.test(code))
    return '';

  const upper = code.toUpperCase();

  return String.fromCodePoint(
    REGIONAL_INDICATOR_OFFSET + upper.charCodeAt(0),
    REGIONAL_INDICATOR_OFFSET + upper.charCodeAt(1),
  );
}
