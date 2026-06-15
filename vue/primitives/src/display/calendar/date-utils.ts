export type WeekDayFormat = 'narrow' | 'short' | 'long';

export interface DateRange {
  start?: Date;
  end?: Date;
}

export function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * `YYYY-MM-DD` from local date fields — unlike `toISOString`, which shifts
 * local-midnight Dates to the previous UTC day in positive-offset timezones.
 */
export function toIsoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isBefore(a: Date, b: Date): boolean {
  return toDateOnly(a).getTime() < toDateOnly(b).getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return toDateOnly(a).getTime() > toDateOnly(b).getTime();
}

export function addDays(d: Date, n: number): Date {
  const r = toDateOnly(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = toDateOnly(d);
  const day = r.getDate();
  // Move to first of month, shift, then clamp day to month length.
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, lastDay));
  return r;
}

export function addYears(d: Date, n: number): Date {
  return addMonths(d, n * 12);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 0, 0, 0, 0);
}

export function getDaysInMonth(d: Date): number {
  return endOfMonth(d).getDate();
}

export function startOfWeek(d: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date {
  const r = toDateOnly(d);
  const day = r.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  r.setDate(r.getDate() - diff);
  return r;
}

/**
 * The locale's first day of week (0=Sun … 6=Sat). Uses `Intl.Locale.weekInfo`
 * when available, otherwise probes a known Monday's index via `Intl` so that
 * e.g. `'en-US'` resolves to Sunday and `'fr'`/`'de'` to Monday. Falls back to
 * Sunday for unparseable locales.
 */
export function getLocaleWeekStartsOn(locale: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  try {
    const info = new Intl.Locale(locale) as Intl.Locale & {
      weekInfo?: { firstDay?: number };
      getWeekInfo?: () => { firstDay?: number };
    };
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    if (typeof firstDay === 'number')
      // `weekInfo.firstDay` is 1=Mon … 7=Sun; convert to 0=Sun … 6=Sat.
      return (firstDay % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  }
  catch {
    // Ignore — fall through to the Intl probe below.
  }
  // Probe: 2025-01-06 is a Monday. Determine its position in the locale week.
  try {
    const monday = new Date(2025, 0, 6);
    const parts = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    // Compare against an anchored Sunday to derive the offset.
    const sundayShort = parts.format(new Date(2025, 0, 5));
    const mondayShort = parts.format(monday);
    if (sundayShort === mondayShort)
      return 0;
    return 1;
  }
  catch {
    return 0;
  }
}

/**
 * Returns a 6×7 matrix of dates for the month containing `month`,
 * padded with leading/trailing days from adjacent months.
 */
export function getWeeks(month: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date[][] {
  const first = startOfMonth(month);
  const gridStart = startOfWeek(first, weekStartsOn);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let i = 0; i < 7; i++)
      row.push(addDays(gridStart, w * 7 + i));
    weeks.push(row);
  }
  return weeks;
}

export function clamp(date: Date, min?: Date, max?: Date): Date {
  if (min && isBefore(date, min))
    return toDateOnly(min);
  if (max && isAfter(date, max))
    return toDateOnly(max);
  return toDateOnly(date);
}

export function isDateUnavailable(
  d: Date,
  predicate?: (d: Date) => boolean,
  min?: Date,
  max?: Date,
): boolean {
  if (min && isBefore(d, min))
    return true;
  if (max && isAfter(d, max))
    return true;
  if (predicate?.(d))
    return true;
  return false;
}

/**
 * Cache of `Intl.DateTimeFormat` instances keyed by `locale|JSON(options)`.
 * Formatter construction is ~1-2 orders of magnitude costlier than `.format()`
 * on an existing instance, and instances are immutable/reusable. The set of
 * distinct (locale, options) pairs a calendar uses is tiny (a handful), so the
 * map stays bounded across the page lifetime.
 */
const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormat(
  locale: string,
  opts: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(opts)}`;
  let fmt = dateTimeFormatCache.get(key);
  if (fmt === undefined) {
    fmt = new Intl.DateTimeFormat(locale, opts);
    dateTimeFormatCache.set(key, fmt);
  }
  return fmt;
}

export function formatDate(
  d: Date,
  opts: Intl.DateTimeFormatOptions,
  locale: string,
): string {
  return getDateTimeFormat(locale, opts).format(d);
}

export function formatWeekday(
  d: Date,
  locale: string,
  width: WeekDayFormat = 'short',
): string {
  return getDateTimeFormat(locale, { weekday: width }).format(d);
}
