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

export function formatDate(
  d: Date,
  opts: Intl.DateTimeFormatOptions,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, opts).format(d);
}

export function formatWeekday(
  d: Date,
  locale: string,
  width: WeekDayFormat = 'short',
): string {
  return new Intl.DateTimeFormat(locale, { weekday: width }).format(d);
}
