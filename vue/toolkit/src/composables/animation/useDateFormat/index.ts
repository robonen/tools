import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { isDate, isString } from '@robonen/stdlib';

/**
 * Accepted input for {@link useDateFormat}: a `Date`, a millisecond timestamp,
 * a parseable date string, or `null`/`undefined` (resolves to "now").
 */
export type DateLike = Date | number | string | null | undefined;

/**
 * Signature for a custom meridiem (AM/PM) formatter.
 *
 * @param hours The hour of the day, 0-23
 * @param minutes The minute of the hour, 0-59
 * @param isLowercase Whether the token requested a lowercase form (`a`/`aa`)
 * @param hasPeriod Whether the token requested period separators (`AA`/`aa`)
 */
export type CustomMeridiem
  = (hours: number, minutes: number, isLowercase?: boolean, hasPeriod?: boolean) => string;

export interface UseDateFormatOptions {
  /**
   * The locale(s) used for the `dd`/`ddd`/`dddd`/`MMM`/`MMMM`/`z` tokens.
   *
   * Accepts a reactive value (ref or getter); the output recomputes when it
   * changes.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#locales_argument
   */
  locales?: MaybeRefOrGetter<Intl.LocalesArgument>;

  /**
   * A custom function controlling how the meridiem (`A`/`AA`/`a`/`aa`) is
   * rendered.
   */
  customMeridiem?: CustomMeridiem;
}

/**
 * Reactive formatted date string.
 */
export type UseDateFormatReturn = ComputedRef<string>;

// Matches a token, or a `[literal]` escape that is emitted verbatim.
const REGEX_FORMAT
  = /* #__PURE__ */ /[YMDHhms]o|\[([^\]]+)\]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a{1,2}|A{1,2}|m{1,2}|s{1,2}|z{1,4}|SSS/g;

// Loose ISO-ish parser used for date strings without a trailing `Z`. The optional
// separators make adjacent digit groups technically "misleading" to the linter,
// but this is the deliberate lenient dayjs parser (accepts `2024-01-01` and
// `20240101`); JS lacks possessive quantifiers to disambiguate it.
// eslint-disable-next-line regexp/no-misleading-capturing-group
const REGEX_PARSE = /* #__PURE__ */ /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[T\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/i;

const ORDINAL_SUFFIXES = ['th', 'st', 'nd', 'rd'] as const;

function defaultMeridiem(
  hours: number,
  _minutes: number,
  isLowercase?: boolean,
  hasPeriod?: boolean,
): string {
  let m = hours < 12 ? 'AM' : 'PM';
  if (hasPeriod) m = `${m[0]}.${m[1]}.`;
  return isLowercase ? m.toLowerCase() : m;
}

function formatOrdinal(num: number): string {
  const v = num % 100;
  return num + (ORDINAL_SUFFIXES[(v - 20) % 10] || ORDINAL_SUFFIXES[v] || ORDINAL_SUFFIXES[0]);
}

/**
 * Coerce a {@link DateLike} into a `Date`. `null`/`undefined` become the
 * current time; a non-UTC string is parsed leniently so partial dates such as
 * `'2024-3'` are accepted.
 *
 * @param date The value to coerce
 * @returns A `Date` instance (possibly `Invalid Date`)
 */
export function normalizeDate(date: DateLike): Date {
  if (date === null || date === undefined) return new Date();
  if (isDate(date)) return new Date(date.getTime());
  if (isString(date) && !/z$/i.test(date)) {
    const d = REGEX_PARSE.exec(date);
    if (d) {
      const month = d[2] ? Number(d[2]) - 1 : 0;
      const ms = (d[7] || '0').slice(0, 3);
      return new Date(
        Number(d[1]),
        month,
        Number(d[3]) || 1,
        Number(d[4]) || 0,
        Number(d[5]) || 0,
        Number(d[6]) || 0,
        Number(ms),
      );
    }
  }

  return new Date(date);
}

/**
 * Format a `Date` against a token string. Exposed for one-shot, non-reactive
 * formatting; {@link useDateFormat} wraps this in a `computed`.
 *
 * @param date The date to format
 * @param formatStr The combination of tokens (e.g. `'YYYY-MM-DD HH:mm:ss'`)
 * @param options Locale and meridiem options
 * @returns The formatted string
 */
export function formatDate(
  date: Date,
  formatStr: string,
  options: UseDateFormatOptions = {},
): string {
  // Invalid dates round-trip to the literal "Invalid Date" rather than
  // emitting `NaN` for every numeric token.
  if (Number.isNaN(date.getTime())) return 'Invalid Date';

  const years = date.getFullYear();
  const month = date.getMonth();
  const days = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  const day = date.getDay();
  const hour12 = hours % 12 || 12;

  const locales = toValue(options.locales);
  const meridiem = options.customMeridiem ?? defaultMeridiem;
  // The timeZoneName lands after the date in the localized string; grab it.
  const offsetName = (style: 'shortOffset' | 'longOffset'): string =>
    date.toLocaleDateString(locales, { timeZoneName: style }).split(' ')[1] ?? '';

  const matches: Record<string, () => string | number> = {
    Yo: () => formatOrdinal(years),
    YY: () => String(years).slice(-2),
    YYYY: () => years,
    M: () => month + 1,
    Mo: () => formatOrdinal(month + 1),
    MM: () => String(month + 1).padStart(2, '0'),
    MMM: () => date.toLocaleDateString(locales, { month: 'short' }),
    MMMM: () => date.toLocaleDateString(locales, { month: 'long' }),
    D: () => String(days),
    Do: () => formatOrdinal(days),
    DD: () => String(days).padStart(2, '0'),
    H: () => String(hours),
    Ho: () => formatOrdinal(hours),
    HH: () => String(hours).padStart(2, '0'),
    h: () => String(hour12),
    ho: () => formatOrdinal(hour12),
    hh: () => String(hour12).padStart(2, '0'),
    m: () => String(minutes),
    mo: () => formatOrdinal(minutes),
    mm: () => String(minutes).padStart(2, '0'),
    s: () => String(seconds),
    so: () => formatOrdinal(seconds),
    ss: () => String(seconds).padStart(2, '0'),
    SSS: () => String(milliseconds).padStart(3, '0'),
    d: () => day,
    dd: () => date.toLocaleDateString(locales, { weekday: 'narrow' }),
    ddd: () => date.toLocaleDateString(locales, { weekday: 'short' }),
    dddd: () => date.toLocaleDateString(locales, { weekday: 'long' }),
    A: () => meridiem(hours, minutes),
    AA: () => meridiem(hours, minutes, false, true),
    a: () => meridiem(hours, minutes, true),
    aa: () => meridiem(hours, minutes, true, true),
    z: () => offsetName('shortOffset'),
    zz: () => offsetName('shortOffset'),
    zzz: () => offsetName('shortOffset'),
    zzzz: () => offsetName('longOffset'),
  };

  return formatStr.replaceAll(REGEX_FORMAT, (match, literal) =>
    literal ?? String(matches[match]?.() ?? match),
  );
}

/**
 * @name useDateFormat
 * @category Animation
 * @description Reactively format a `Date`, timestamp, or date string against a
 * token string (`YYYY MM DD HH mm ss SSS dddd A` etc.). Recomputes when the
 * date, format, or locale changes.
 *
 * @param {MaybeRefOrGetter<DateLike>} date The date to format
 * @param {MaybeRefOrGetter<string>} [formatStr='HH:mm:ss'] The token string
 * @param {UseDateFormatOptions} [options={}] Locale and meridiem options
 * @returns {ComputedRef<string>} The reactive formatted string
 *
 * @example
 * const formatted = useDateFormat(useNow(), 'YYYY-MM-DD HH:mm:ss');
 *
 * @example
 * // Localized weekday + month, reactive locale
 * const locale = ref('fr-FR');
 * const label = useDateFormat(date, 'dddd, MMMM D', { locales: locale });
 *
 * @example
 * // Custom meridiem
 * const t = useDateFormat(date, 'hh:mm a', {
 *   customMeridiem: (h) => (h < 12 ? 'morning' : 'evening'),
 * });
 *
 * @since 0.0.15
 */
export function useDateFormat(
  date: MaybeRefOrGetter<DateLike>,
  formatStr: MaybeRefOrGetter<string> = 'HH:mm:ss',
  options: UseDateFormatOptions = {},
): UseDateFormatReturn {
  return computed(() => formatDate(normalizeDate(toValue(date)), toValue(formatStr), options));
}
