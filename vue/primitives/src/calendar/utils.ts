import type { WeekDayFormat } from './date-utils';
import {
  addMonths,
  formatDate,
  formatWeekday,
  getWeeks,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from './date-utils';

export * from './date-utils';

export interface CalendarMonth {
  /** First day of this month (date-only). */
  value: Date;
  /** N×7 grid of dates including leading/trailing adjacent-month days. */
  weeks: Date[][];
}

export interface CreateMonthsOptions {
  date: Date;
  numberOfMonths: number;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Always render 6 weeks per month. @default true */
  fixedWeeks?: boolean;
}

/** Build N consecutive months starting from `date`'s month. */
export function createMonths(opts: CreateMonthsOptions): CalendarMonth[] {
  const { fixedWeeks = true } = opts;
  const months: CalendarMonth[] = [];
  for (let i = 0; i < opts.numberOfMonths; i++) {
    const m = startOfMonth(addMonths(opts.date, i));
    let weeks = getWeeks(m, opts.weekStartsOn);
    // Only trailing weeks can be entirely outside the month — the first week
    // always contains the 1st.
    if (!fixedWeeks)
      weeks = weeks.filter(week => week.some(d => isSameMonth(d, m)));
    months.push({ value: m, weeks });
  }
  return months;
}

/** Localized short/narrow/long weekday names starting from `weekStartsOn`. */
export function getWeekdayLabels(
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  locale: string,
  width: WeekDayFormat,
): string[] {
  // Pick any known Sunday (1970-01-04 is a Sunday) as anchor.
  const anchorSunday = new Date(1970, 0, 4);
  const start = startOfWeek(anchorSunday, weekStartsOn);
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    labels.push(formatWeekday(d, locale, width));
  }
  return labels;
}

export function formatMonthYear(d: Date, locale: string): string {
  return formatDate(d, { month: 'long', year: 'numeric' }, locale);
}

export function formatFullDate(d: Date, locale: string): string {
  return formatDate(
    d,
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    locale,
  );
}
