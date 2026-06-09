import { clamp } from '@robonen/stdlib';
import type { ElementState, MaskOptions, MaskPostprocessor, MaskPreprocessor } from '../types';

const ESCAPE_REGEXP = /[$()*+.?[\\\]^{|}]/g;

function escapeRegExp(source: string): string {
  return source.replaceAll(ESCAPE_REGEXP, '\\$&');
}

/**
 * Parameters for {@link maskNumberOptions}.
 */
export interface MaskNumberParams {
  /**
   * Decimal separator.
   *
   * @default '.'
   */
  readonly decimalSeparator?: string;
  /**
   * Grouping separator for thousands. Empty disables grouping.
   *
   * @default ''
   */
  readonly thousandSeparator?: string;
  /**
   * Max fractional digits. `0` means integer only.
   *
   * @default 0
   */
  readonly precision?: number;
  /**
   * Upper bound — typed values above it snap down to it (applied live).
   */
  readonly max?: number;
  /**
   * Allow a leading minus sign.
   *
   * @default false
   */
  readonly allowNegative?: boolean;
  /**
   * Static prefix (e.g. `'$'`).
   *
   * @default ''
   */
  readonly prefix?: string;
  /**
   * Static postfix (e.g. `' USD'`).
   *
   * @default ''
   */
  readonly postfix?: string;
}

interface ResolvedNumberParams {
  readonly decimalSeparator: string;
  readonly thousandSeparator: string;
  readonly precision: number;
  readonly max: number | undefined;
  readonly allowNegative: boolean;
  readonly prefix: string;
  readonly postfix: string;
}

/**
 * Remove every `char` from `value`, remapping the selection to the stripped text.
 */
function stripCharacter(state: ElementState, char: string): ElementState {
  if (!char)
    return state;

  const { value, selection } = state;
  const [from, to] = selection;

  let stripped = '';
  let newFrom = from;
  let newTo = to;

  for (let i = 0; i < value.length; i++) {
    const current = value[i];
    if (current === undefined)
      continue;

    if (current === char) {
      if (i < from)
        newFrom -= 1;
      if (i < to)
        newTo -= 1;
    }
    else {
      stripped += current;
    }
  }

  const end = stripped.length;

  return { value: stripped, selection: [clamp(newFrom, 0, end), clamp(newTo, 0, end)] };
}

/**
 * Strip a fixed prefix/postfix, shifting the selection into the body.
 */
function stripAffixes(state: ElementState, prefix: string, postfix: string): ElementState {
  let { value } = state;
  let [from, to] = state.selection;

  if (prefix && value.startsWith(prefix)) {
    value = value.slice(prefix.length);
    from -= prefix.length;
    to -= prefix.length;
  }

  if (postfix && value.endsWith(postfix))
    value = value.slice(0, -postfix.length);

  const end = value.length;

  return { value, selection: [clamp(from, 0, end), clamp(to, 0, end)] };
}

function numberPreprocessor(params: ResolvedNumberParams): MaskPreprocessor {
  return ({ elementState, data }) => {
    const withoutAffixes = stripAffixes(elementState, params.prefix, params.postfix);
    const canonical = stripCharacter(withoutAffixes, params.thousandSeparator);

    // Treat a typed '.'/',' as the configured decimal separator.
    const normalizedData = params.precision > 0 && (data === '.' || data === ',')
      ? params.decimalSeparator
      : data;

    return { elementState: canonical, data: normalizedData };
  };
}

function groupThousands(intDigits: string, separator: string): string {
  if (!separator)
    return intDigits;

  let grouped = '';
  for (let i = 0; i < intDigits.length; i++) {
    if (i > 0 && (intDigits.length - i) % 3 === 0)
      grouped += separator;
    grouped += intDigits[i];
  }

  return grouped;
}

/**
 * Map a caret in canonical (separator-free) coordinates onto the grouped body by
 * walking the body and skipping thousand separators.
 */
function mapCaretToBody(body: string, separator: string, canonicalCaret: number): number {
  if (!separator)
    return canonicalCaret;

  let significant = 0;
  for (let i = 0; i < body.length; i++) {
    if (significant === canonicalCaret)
      return i;
    if (body[i] !== separator)
      significant += 1;
  }

  return body.length;
}

function numberPostprocessor(params: ResolvedNumberParams): MaskPostprocessor {
  const { decimalSeparator, thousandSeparator, prefix, postfix, max } = params;

  return (state) => {
    const [caret] = state.selection;
    let canonical = state.value;

    // Live max clamp on the settled numeric value.
    if (max !== undefined && canonical && !canonical.endsWith(decimalSeparator)) {
      const numeric = Number(canonical.replace(decimalSeparator, '.'));
      if (Number.isFinite(numeric) && numeric > max)
        canonical = String(max).replace('.', decimalSeparator);
    }

    const negative = canonical.startsWith('-');
    const unsigned = negative ? canonical.slice(1) : canonical;
    const [intPart = '', fracPart] = unsigned.split(decimalSeparator);

    const sign = negative ? '-' : '';
    const grouped = groupThousands(intPart, thousandSeparator);
    const body = sign + grouped + (fracPart !== undefined ? decimalSeparator + fracPart : '');

    const value = prefix + body + postfix;
    const bodyCaret = mapCaretToBody(body, thousandSeparator, clamp(caret, 0, canonical.length));
    const mapped = prefix.length + clamp(bodyCaret, 0, body.length);

    return { value, selection: [mapped, mapped] };
  };
}

/**
 * @name maskNumberOptions
 * @category Forms
 * @description Mask options for a formatted number: optional thousands grouping,
 * decimal precision, sign, prefix/postfix, and a live upper-bound clamp. The
 * unmasked value is the canonical, separator-free number string.
 *
 * @param {MaskNumberParams} [params={}] Formatting options
 * @returns {MaskOptions} Ready-to-use mask options
 *
 * @example
 * maskNumberOptions({ thousandSeparator: ',', precision: 2, prefix: '$' });
 * // typing 1234.5 → '$1,234.5'
 *
 * @since 0.0.17
 */
export function maskNumberOptions(params: MaskNumberParams = {}): MaskOptions {
  const resolved: ResolvedNumberParams = {
    decimalSeparator: params.decimalSeparator ?? '.',
    thousandSeparator: params.thousandSeparator ?? '',
    precision: params.precision ?? 0,
    max: params.max,
    allowNegative: params.allowNegative ?? false,
    prefix: params.prefix ?? '',
    postfix: params.postfix ?? '',
  };

  const sign = resolved.allowNegative ? '-?' : '';
  const decimal = resolved.precision > 0
    ? `(${escapeRegExp(resolved.decimalSeparator)}\\d{0,${resolved.precision}})?`
    : '';
  const mask = new RegExp(`^${sign}\\d*${decimal}$`);

  return {
    mask,
    preprocessors: [numberPreprocessor(resolved)],
    postprocessors: [numberPostprocessor(resolved)],
  };
}
