import type { MaskOptions } from '../types';
import { maskFromTemplate } from './template';

/**
 * Parameters for {@link maskPhoneOptions}.
 */
export interface MaskPhoneParams {
  /**
   * The phone template, e.g. `'+1 (###) ###-####'`.
   */
  readonly template: string;
  /**
   * Override the token → matcher map.
   */
  readonly tokens?: Readonly<Record<string, RegExp>>;
}

/**
 * @name maskPhoneOptions
 * @category Forms
 * @description Mask options for a phone number, built from a single template
 * string. For a mask that adapts to the typed country code, see
 * {@link maskPhoneCountryOptions}.
 *
 * @param {MaskPhoneParams} params The template (and optional tokens)
 * @returns {MaskOptions} Ready-to-use mask options
 *
 * @example
 * maskPhoneOptions({ template: '+1 (###) ###-####' });
 *
 * @since 0.0.17
 */
export function maskPhoneOptions(params: MaskPhoneParams): MaskOptions {
  return { mask: maskFromTemplate(params.template, params.tokens) };
}
