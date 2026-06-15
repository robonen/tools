import type {
  CalendarMonth,
  CreateMonthsOptions,
  WeekDayFormat,
} from '../../display/calendar/utils';
import {
  addDays,
  addMonths,
  addYears,
  clamp,
  createMonths,
  endOfMonth,
  findFirstFocusableDate,
  formatDate,
  formatFullDate,
  formatMonthYear,
  formatWeekday,
  getDaysInMonth,
  getLocaleWeekStartsOn,
  getWeekdayLabels,
  getWeeks,
  isAfter,
  isBefore,
  isDateUnavailable,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  toDateOnly,
  toIsoDate,
} from '../../display/calendar/utils';

/** First day of the week, `0` (Sunday) through `6` (Saturday). */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * A calendar date broken into numeric fields. `month` is **1-based** (January
 * is `1`) to mirror the segmented field's user-facing values; `fromParts`
 * converts it back to the native representation. Time fields are optional and
 * default to `0` when constructing.
 */
export interface DateParts {
  year: number;
  /** 1-based month (January = 1). */
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

/** `DateParts` with every field resolved (used as `getParts` output). */
export type ResolvedDateParts = Required<DateParts>;

/**
 * Pluggable date backend abstracting every date operation the calendar and
 * date-picker primitives need, generic over the date representation `TDate`.
 * The default {@link nativeDateAdapter} operates on the JS `Date`; provide a
 * custom adapter through `ConfigProvider`/`provideConfig({ dateAdapter })` (or a
 * per-component `dateAdapter` prop) to swap in another calendar system or date
 * library while keeping the primitives unchanged.
 *
 * The boundary type is `TDate` throughout: a primitive that resolves the
 * adapter via `useDateAdapter<TDate>()` hands the adapter its own date values
 * and receives `TDate` back, so a single adapter governs construction,
 * arithmetic, comparison, formatting and grid building consistently.
 */
export interface DateAdapter<TDate = Date> {
  // --- construction / identity ---
  /** The current date-time ("now"/"today"). */
  now: () => TDate;
  /** An independent copy of `date`, preserving the full time-of-day. */
  clone: (date: TDate) => TDate;
  /** A copy of `date` with the time-of-day stripped to local midnight. */
  toDateOnly: (date: TDate) => TDate;
  /** Build a date from numeric fields (`month` is 1-based; time defaults to 0). */
  fromParts: (parts: DateParts) => TDate;
  /** Extract the numeric fields of `date` (`month` is 1-based). */
  getParts: (date: TDate) => ResolvedDateParts;
  /** Day of week, `0` (Sunday) through `6` (Saturday). */
  getDay: (date: TDate) => number;
  /** Parse free-form user text into a date, or `null` when unparseable. */
  parse: (text: string) => TDate | null;
  /** Full ISO-8601 string (UTC), used for hidden form-input serialization. */
  toISO: (date: TDate) => string;

  // --- arithmetic ---
  addDays: (date: TDate, amount: number) => TDate;
  addMonths: (date: TDate, amount: number) => TDate;
  addYears: (date: TDate, amount: number) => TDate;
  startOfMonth: (date: TDate) => TDate;
  endOfMonth: (date: TDate) => TDate;
  startOfWeek: (date: TDate, weekStartsOn: WeekDay) => TDate;
  /** Number of days in `date`'s month. */
  getDaysInMonth: (date: TDate) => number;

  // --- comparison ---
  isSameDay: (a: TDate, b: TDate) => boolean;
  isSameMonth: (a: TDate, b: TDate) => boolean;
  /** Date-only `a < b` (time-of-day ignored). */
  isBefore: (a: TDate, b: TDate) => boolean;
  /** Date-only `a > b` (time-of-day ignored). */
  isAfter: (a: TDate, b: TDate) => boolean;
  /** Full-timestamp ordering: negative if `a < b`, `0` if equal, positive if `a > b`. */
  compare: (a: TDate, b: TDate) => number;
  /** Clamp `date` (date-only) into the optional `[min, max]` range. */
  clamp: (date: TDate, min?: TDate, max?: TDate) => TDate;
  /** Whether `date` is out of `[min, max]` bounds or matched by `predicate`. */
  isDateUnavailable: (
    date: TDate,
    predicate?: (date: TDate) => boolean,
    min?: TDate,
    max?: TDate,
  ) => boolean;

  // --- locale / formatting ---
  getLocaleWeekStartsOn: (locale: string) => WeekDay;
  format: (date: TDate, options: Intl.DateTimeFormatOptions, locale: string) => string;
  formatWeekday: (date: TDate, locale: string, width: WeekDayFormat) => string;
  formatMonthYear: (date: TDate, locale: string) => string;
  formatFullDate: (date: TDate, locale: string) => string;
  /** Local `YYYY-MM-DD` (does not shift across the UTC boundary). */
  toIsoDate: (date: TDate) => string;

  // --- grid building ---
  getWeeks: (month: TDate, weekStartsOn: WeekDay) => TDate[][];
  createMonths: (options: CreateMonthsOptions<TDate>) => Array<CalendarMonth<TDate>>;
  getWeekdayLabels: (weekStartsOn: WeekDay, locale: string, width: WeekDayFormat) => string[];
  findFirstFocusableDate: (
    months: Array<CalendarMonth<TDate>>,
    isDisabled: (date: TDate) => boolean,
    isUnavailable: (date: TDate) => boolean,
  ) => TDate | undefined;
}

/**
 * A type-erased {@link DateAdapter}, used where the concrete date
 * representation is not statically known (e.g. the global config context, which
 * may hold an adapter for any date library). Recover the precise type at the
 * consumer with `useDateAdapter<TDate>()`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional erasure across the inject boundary
export type AnyDateAdapter = DateAdapter<any>;

/**
 * Default {@link DateAdapter} backed by the native JS `Date`. Delegates to the
 * package's `Date`-based date utilities, so it is the zero-config behavior when
 * no custom adapter is provided.
 */
export const nativeDateAdapter: DateAdapter<Date> = {
  // --- construction / identity ---
  now: () => new Date(),
  clone: date => new Date(date.getTime()),
  toDateOnly,
  fromParts: ({ year, month, day, hour = 0, minute = 0, second = 0 }) =>
    new Date(year, month - 1, day, hour, minute, second, 0),
  getParts: date => ({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  }),
  getDay: date => date.getDay(),
  parse: (text) => {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  },
  toISO: date => date.toISOString(),

  // --- arithmetic ---
  addDays,
  addMonths,
  addYears,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  getDaysInMonth,

  // --- comparison ---
  isSameDay,
  isSameMonth,
  isBefore,
  isAfter,
  compare: (a, b) => a.getTime() - b.getTime(),
  clamp,
  isDateUnavailable,

  // --- locale / formatting ---
  getLocaleWeekStartsOn,
  format: formatDate,
  formatWeekday,
  formatMonthYear,
  formatFullDate,
  toIsoDate,

  // --- grid building ---
  getWeeks,
  createMonths,
  getWeekdayLabels,
  findFirstFocusableDate,
};
