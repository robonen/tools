import type { DateAdapter } from '../../utilities/config-provider/date-adapter';

/**
 * Parse text typed the way the field displays it — in the locale's own part
 * order and separators — into a date.
 *
 * `new Date('05.06.2023')` is `Invalid Date` and `new Date('05/06/2023')` is
 * May 6th regardless of the user's locale, so a free-form parse cannot be the
 * only path for an editable field. Instead the order of `day`/`month`/`year`
 * is read from `Intl.DateTimeFormat(locale, format).formatToParts`, and the
 * digit groups of the text are mapped onto it. Formats with a textual month
 * (`'long'`, `'short'`) yield fewer digit groups than parts and fall through
 * to `null`, leaving the caller to try the adapter's free-form parse.
 *
 * Two-digit years follow the usual pivot: `00–69` → 2000s, `70–99` → 1900s.
 * Overflowing days (`31.02`) are rejected rather than rolled over.
 */
export function parseLocalizedDate<TDate>(
  text: string,
  locale: string,
  format: Intl.DateTimeFormatOptions,
  adapter: DateAdapter<TDate>,
): TDate | null {
  const groups = text.match(/\d+/g);
  if (!groups)
    return null;

  const order = new Intl.DateTimeFormat(locale, format)
    .formatToParts(new Date(2001, 1, 3))
    .map(part => part.type)
    .filter((type): type is 'day' | 'month' | 'year' => type === 'day' || type === 'month' || type === 'year');

  if (order.length !== 3 || groups.length !== 3 || new Set(order).size !== 3)
    return null;

  const fields = { day: 0, month: 0, year: 0 };
  order.forEach((type, index) => {
    fields[type] = Number.parseInt(groups[index]!, 10);
  });

  const yearDigits = groups[order.indexOf('year')]!.length;
  if (yearDigits <= 2)
    fields.year += fields.year < 70 ? 2000 : 1900;

  if (fields.month < 1 || fields.month > 12 || fields.day < 1 || fields.day > 31)
    return null;

  const date = adapter.fromParts(fields);
  const parts = adapter.getParts(date);
  return parts.month === fields.month && parts.day === fields.day ? date : null;
}
