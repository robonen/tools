import type { ElementState, MaskExpression, MaskOptions } from '../types';
import { maskFromTemplate } from './template';

const NON_DIGIT = /\D/g;

/**
 * Build a digit-driven dynamic mask: the template is recomputed only when the
 * stripped digit string changes (`resolveMask` fires several times per keystroke
 * with the same digits, and the expression is a pure function of them). Shared
 * by the card- and phone-country presets, which differ only in how they turn the
 * digits into a template.
 *
 * @param resolveTemplate Maps the current digit string to a mask template (it
 *   should already apply its own fallback when nothing matches).
 * @param fallback Template used for the initial (empty) state.
 * @param tokens Token map applied to every template.
 */
export function createDynamicMask(
  resolveTemplate: (digits: string) => string,
  fallback: string,
  tokens?: Readonly<Record<string, RegExp>>,
): MaskOptions {
  // 1-entry memo keyed on the digit string.
  let lastDigits = '';
  let lastExpression: MaskExpression = maskFromTemplate(fallback, tokens);

  return {
    mask: (state: ElementState): MaskExpression => {
      const digits = state.value.replaceAll(NON_DIGIT, '');
      if (digits === lastDigits)
        return lastExpression;

      lastDigits = digits;
      lastExpression = maskFromTemplate(resolveTemplate(digits), tokens);

      return lastExpression;
    },
  };
}
