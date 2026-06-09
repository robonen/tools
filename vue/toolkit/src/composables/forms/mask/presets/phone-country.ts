import { PHONE_COUNTRIES, findPhoneCountry } from '@robonen/platform/multi';
import type { PhoneCountry } from '@robonen/platform/multi';
import type { ElementState, MaskExpression, MaskOptions } from '../types';
import { maskFromTemplate } from './template';

// Re-export the platform reference data + resolver so mask consumers get them
// from one place (the source of truth lives in `@robonen/platform`).
export { PHONE_COUNTRIES, findPhoneCountry } from '@robonen/platform/multi';
export type { PhoneCountry } from '@robonen/platform/multi';

const NON_DIGIT = /\D/g;
const DEFAULT_PHONE_FALLBACK = '+###############';

/**
 * Parameters for {@link maskPhoneCountryOptions}.
 */
export interface MaskPhoneCountryParams {
  /**
   * Known countries, matched by {@link findPhoneCountry}.
   *
   * @default PHONE_COUNTRIES
   */
  readonly countries?: readonly PhoneCountry[];
  /**
   * Template used before any country code is recognized.
   *
   * @default '+###############'
   */
  readonly fallback?: string;
  /**
   * Token map applied to every template.
   */
  readonly tokens?: Readonly<Record<string, RegExp>>;
}

/**
 * @name maskPhoneCountryOptions
 * @category Forms
 * @description A dynamic phone mask that switches format based on the typed
 * country dialing code. The mask is a function of state: it reads the leading
 * digits, resolves the country via {@link findPhoneCountry} (dialing code → area
 * code → priority), and applies that country's template — falling back to a
 * generic international template until a code is recognized. Defaults to the full
 * {@link PHONE_COUNTRIES} set. The unmasked value is the digit string.
 *
 * @param {MaskPhoneCountryParams} [params={}] Countries and fallback template
 * @returns {MaskOptions} Ready-to-use mask options (a function mask)
 *
 * @example
 * // Typing "+1…" formats as US, "+380…" as Ukraine, etc.
 * const phone = useMaskedInput({ mask: maskPhoneCountryOptions() });
 * // <input v-bind="phone.bind">
 *
 * @example
 * maskPhoneCountryOptions({
 *   countries: [{ code: '34', template: '+## ### ### ###' }], // Spain only
 *   fallback: '+#############',
 * });
 *
 * @since 0.0.17
 */
export function maskPhoneCountryOptions(params: MaskPhoneCountryParams = {}): MaskOptions {
  const countries = params.countries ?? PHONE_COUNTRIES;
  const fallback = params.fallback ?? DEFAULT_PHONE_FALLBACK;

  // 1-entry memo: resolveMask fires several times per keystroke with the same
  // digits, and the expression is a pure function of those digits.
  let lastDigits = '';
  let lastExpression: MaskExpression = maskFromTemplate(fallback, params.tokens);

  return {
    mask: (state: ElementState): MaskExpression => {
      const digits = state.value.replaceAll(NON_DIGIT, '');
      if (digits === lastDigits)
        return lastExpression;

      const country = findPhoneCountry(digits, countries);
      lastDigits = digits;
      lastExpression = maskFromTemplate(country?.template ?? fallback, params.tokens);

      return lastExpression;
    },
  };
}
