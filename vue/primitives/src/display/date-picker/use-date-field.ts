import type { DateAdapter } from '../../utilities/config-provider';

export type Granularity = 'day' | 'hour' | 'minute' | 'second';
export type HourCycle = 12 | 24 | undefined;

export type DateSegmentPart = 'day' | 'month' | 'year';
export type TimeSegmentPart = 'hour' | 'minute' | 'second' | 'dayPeriod';
export type EditableSegmentPart = DateSegmentPart | TimeSegmentPart;
export type SegmentPart = EditableSegmentPart | 'literal';

export type DayPeriod = 'AM' | 'PM';

export interface SegmentValues {
  day: number | null;
  month: number | null;
  year: number | null;
  hour?: number | null;
  minute?: number | null;
  second?: number | null;
  dayPeriod?: DayPeriod;
}

export interface SegmentContent {
  part: SegmentPart;
  value: string;
}

export const DATE_SEGMENT_PARTS: DateSegmentPart[] = ['day', 'month', 'year'];
export const TIME_SEGMENT_PARTS: TimeSegmentPart[] = ['hour', 'minute', 'second', 'dayPeriod'];
export const EDITABLE_SEGMENT_PARTS: EditableSegmentPart[] = [...DATE_SEGMENT_PARTS, ...TIME_SEGMENT_PARTS];

export function isEditableSegmentPart(part: string): part is EditableSegmentPart {
  return (EDITABLE_SEGMENT_PARTS as string[]).includes(part);
}

export function hasTimeGranularity(granularity: Granularity): boolean {
  return granularity === 'hour' || granularity === 'minute' || granularity === 'second';
}

export function isSegmentNavigationKey(key: string): boolean {
  return key === 'ArrowLeft' || key === 'ArrowRight';
}

export function isNumberKey(key: string): boolean {
  return key.length === 1 && key >= '0' && key <= '9';
}

export function isAcceptableSegmentKey(key: string): boolean {
  if (isNumberKey(key))
    return true;
  switch (key) {
    case 'Enter':
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'Backspace':
    case 'Delete':
    case ' ':
    case 'a':
    case 'A':
    case 'p':
    case 'P':
      return true;
    default:
      return false;
  }
}

/** Empty value set for the requested granularity. */
export function initializeSegmentValues(granularity: Granularity): SegmentValues {
  const base: SegmentValues = { day: null, month: null, year: null };
  if (!hasTimeGranularity(granularity))
    return base;
  base.hour = null;
  base.dayPeriod = 'AM';
  if (granularity === 'minute' || granularity === 'second')
    base.minute = null;
  if (granularity === 'second')
    base.second = null;
  return base;
}

/** Extract segment values from a concrete date for the requested granularity. */
export function syncSegmentValues(
  adapter: DateAdapter<Date>,
  date: Date,
  granularity: Granularity,
): SegmentValues {
  const parts = adapter.getParts(date);
  const values: SegmentValues = {
    day: parts.day,
    month: parts.month,
    year: parts.year,
  };
  if (hasTimeGranularity(granularity)) {
    const h = parts.hour;
    values.hour = h;
    values.dayPeriod = h >= 12 ? 'PM' : 'AM';
    if (granularity === 'minute' || granularity === 'second')
      values.minute = parts.minute;
    if (granularity === 'second')
      values.second = parts.second;
  }
  return values;
}

/** True when every editable part for the granularity has a value. */
export function isSegmentValuesComplete(values: SegmentValues, granularity: Granularity): boolean {
  if (values.day === null || values.month === null || values.year === null)
    return false;
  if (!hasTimeGranularity(granularity))
    return true;
  if (values.hour === null || values.hour === undefined)
    return false;
  if ((granularity === 'minute' || granularity === 'second') && (values.minute === null || values.minute === undefined))
    return false;
  if (granularity === 'second' && (values.second === null || values.second === undefined))
    return false;
  return true;
}

/** Build a date from complete segment values (caller guarantees completeness). */
export function segmentValuesToDate(
  adapter: DateAdapter<Date>,
  values: SegmentValues,
  granularity: Granularity,
): Date {
  const year = values.year as number;
  const month = values.month as number;
  const day = values.day as number;
  if (!hasTimeGranularity(granularity))
    return adapter.fromParts({ year, month, day });
  const hour = (values.hour as number) ?? 0;
  const minute = (granularity === 'minute' || granularity === 'second') ? ((values.minute as number) ?? 0) : 0;
  const second = granularity === 'second' ? ((values.second as number) ?? 0) : 0;
  return adapter.fromParts({ year, month, day, hour, minute, second });
}

interface FormatPartOptions {
  hourCycle: HourCycle;
  locale: string;
}

/** Render the live string for a single segment, falling back to a placeholder. */
export function formatSegment(
  part: SegmentPart,
  values: SegmentValues,
  placeholder: Date,
  opts: FormatPartOptions,
): string {
  switch (part) {
    case 'day':
      return values.day === null ? 'dd' : String(values.day).padStart(2, '0');
    case 'month':
      return values.month === null ? 'mm' : String(values.month).padStart(2, '0');
    case 'year':
      return values.year === null ? 'yyyy' : String(values.year).padStart(4, '0');
    case 'hour': {
      if (values.hour === null || values.hour === undefined)
        return 'hh';
      const is12 = resolveHourCycle(opts.hourCycle, opts.locale) === 12;
      if (!is12)
        return String(values.hour).padStart(2, '0');
      const h = values.hour % 12 === 0 ? 12 : values.hour % 12;
      return String(h).padStart(2, '0');
    }
    case 'minute':
      return values.minute === null || values.minute === undefined ? 'mm' : String(values.minute).padStart(2, '0');
    case 'second':
      return values.second === null || values.second === undefined ? 'ss' : String(values.second).padStart(2, '0');
    case 'dayPeriod':
      return values.dayPeriod ?? 'AM';
    default:
      return '';
  }
}

let cachedLocale: string | undefined;
let cachedHourCycleIs12: boolean | undefined;

/** Resolve the effective hour cycle: explicit prop wins, else infer from locale. */
export function resolveHourCycle(hourCycle: HourCycle, locale: string): 12 | 24 {
  if (hourCycle === 12 || hourCycle === 24)
    return hourCycle;
  if (cachedLocale !== locale) {
    cachedLocale = locale;
    try {
      const resolved = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
      cachedHourCycleIs12 = resolved === 'h11' || resolved === 'h12';
    }
    catch {
      cachedHourCycleIs12 = false;
    }
  }
  return cachedHourCycleIs12 ? 12 : 24;
}

/**
 * Ordered list of segment descriptors (incl. literals) honoring locale order
 * for the date parts and a fixed time order, mirroring native formatting.
 */
export function createSegmentContents(
  values: SegmentValues,
  placeholder: Date,
  granularity: Granularity,
  hourCycle: HourCycle,
  locale: string,
): SegmentContent[] {
  const dateOrder = resolveDatePartOrder(locale);
  const dateLiteral = resolveDateLiteral(locale);
  const out: SegmentContent[] = [];

  dateOrder.forEach((part, index) => {
    if (index > 0)
      out.push({ part: 'literal', value: dateLiteral });
    out.push({ part, value: formatSegment(part, values, placeholder, { hourCycle, locale }) });
  });

  if (hasTimeGranularity(granularity)) {
    out.push({ part: 'literal', value: ', ' });
    out.push({ part: 'hour', value: formatSegment('hour', values, placeholder, { hourCycle, locale }) });
    if (granularity === 'minute' || granularity === 'second') {
      out.push({ part: 'literal', value: ':' });
      out.push({ part: 'minute', value: formatSegment('minute', values, placeholder, { hourCycle, locale }) });
    }
    if (granularity === 'second') {
      out.push({ part: 'literal', value: ':' });
      out.push({ part: 'second', value: formatSegment('second', values, placeholder, { hourCycle, locale }) });
    }
    if (resolveHourCycle(hourCycle, locale) === 12) {
      out.push({ part: 'literal', value: ' ' });
      out.push({ part: 'dayPeriod', value: formatSegment('dayPeriod', values, placeholder, { hourCycle, locale }) });
    }
  }

  return out;
}

const datePartOrderCache = new Map<string, DateSegmentPart[]>();

/** Derive `[day, month, year]` order from the locale's numeric format. */
export function resolveDatePartOrder(locale: string): DateSegmentPart[] {
  const cached = datePartOrderCache.get(locale);
  if (cached)
    return cached;
  let order: DateSegmentPart[] = ['month', 'day', 'year'];
  try {
    const parts = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
      .formatToParts(new Date(2000, 0, 2));
    const derived = parts
      .map(p => p.type)
      .filter((t): t is DateSegmentPart => t === 'day' || t === 'month' || t === 'year');
    if (derived.length === 3)
      order = derived;
  }
  catch {
    // keep default
  }
  datePartOrderCache.set(locale, order);
  return order;
}

function resolveDateLiteral(locale: string): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
      .formatToParts(new Date(2000, 0, 2));
    const literal = parts.find(p => p.type === 'literal');
    if (literal && literal.value.trim().length <= 1)
      return literal.value;
  }
  catch {
    // keep default
  }
  return '/';
}

interface TypeAheadState {
  hasLeftFocus: boolean;
  lastKeyZero: boolean;
}

interface UpdateResult {
  value: number | null;
  moveToNext: boolean;
}

/** Numeric type-ahead for capped two-digit fields (day/month/hour/minute/second). */
function updateCappedField(
  max: number,
  num: number,
  prev: number | null,
  state: TypeAheadState,
  allowZeroValue: boolean,
): UpdateResult {
  const maxStart = Math.floor(max / 10);

  if (state.hasLeftFocus) {
    state.hasLeftFocus = false;
    state.lastKeyZero = false;
    prev = null;
  }

  if (prev === null || prev === undefined) {
    if (num === 0) {
      state.lastKeyZero = true;
      return { value: allowZeroValue ? 0 : null, moveToNext: false };
    }
    const moveToNext = state.lastKeyZero || num > maxStart;
    state.lastKeyZero = false;
    return { value: num, moveToNext };
  }

  const digits = prev.toString().length;
  const total = Number.parseInt(prev.toString() + num.toString(), 10);

  if (digits === 2 || total > max) {
    const moveToNext = num > maxStart || total > max;
    return { value: num, moveToNext };
  }
  return { value: total, moveToNext: true };
}

function updateYear(num: number, prev: number | null, state: TypeAheadState): UpdateResult {
  if (state.hasLeftFocus) {
    state.hasLeftFocus = false;
    prev = null;
  }
  if (prev === null || prev === undefined)
    return { value: num === 0 ? 1 : num, moveToNext: false };
  const str = prev.toString() + num.toString();
  if (str.length > 4)
    return { value: num === 0 ? 1 : num, moveToNext: false };
  return { value: Number.parseInt(str, 10), moveToNext: str.length === 4 };
}

function cycle(value: number | null, delta: number, min: number, max: number, fallback: number): number {
  if (value === null || value === undefined)
    return delta > 0 ? min : fallback;
  let next = value + delta;
  const range = max - min + 1;
  if (next > max)
    next = min + ((next - min) % range);
  if (next < min)
    next = max - ((min - next - 1) % range);
  return next;
}

export interface SegmentKeydownContext {
  adapter: DateAdapter<Date>;
  part: EditableSegmentPart;
  values: SegmentValues;
  placeholder: Date;
  granularity: Granularity;
  hourCycle: HourCycle;
  locale: string;
  state: TypeAheadState;
  focusNext: () => void;
}

/**
 * Apply a keydown to a single segment, returning the new value for that part
 * (and, for hour edits, the synchronized day-period). Returns `null` value to
 * clear. The caller writes the result into `segmentValues` and commits.
 */
export function applySegmentKeydown(
  e: KeyboardEvent,
  ctx: SegmentKeydownContext,
): { part: EditableSegmentPart; value: number | string | null; dayPeriod?: DayPeriod } | undefined {
  const { adapter, part, values, placeholder, state } = ctx;
  const key = e.key;

  if (!isAcceptableSegmentKey(key) || isSegmentNavigationKey(key))
    return undefined;

  if (key === 'Backspace' || key === 'Delete') {
    state.hasLeftFocus = false;
    return { part, value: deleteDigit(values[part] as number | string | null) };
  }

  if (part === 'dayPeriod')
    return applyDayPeriod(e, values);

  const isArrow = key === 'ArrowUp' || key === 'ArrowDown';
  const delta = key === 'ArrowUp' ? 1 : -1;

  switch (part) {
    case 'day': {
      const monthDays = values.month
        ? adapter.getDaysInMonth(adapter.fromParts({ year: adapter.getParts(placeholder).year, month: values.month, day: 1 }))
        : 31;
      if (isArrow)
        return { part, value: cycle(values.day, delta, 1, monthDays, monthDays) };
      if (isNumberKey(key)) {
        const r = updateCappedField(monthDays, Number.parseInt(key, 10), values.day, state, false);
        if (r.moveToNext)
          ctx.focusNext();
        return { part, value: r.value };
      }
      return undefined;
    }
    case 'month': {
      if (isArrow)
        return { part, value: cycle(values.month, delta, 1, 12, 12) };
      if (isNumberKey(key)) {
        const r = updateCappedField(12, Number.parseInt(key, 10), values.month, state, false);
        if (r.moveToNext)
          ctx.focusNext();
        return { part, value: r.value };
      }
      return undefined;
    }
    case 'year': {
      if (isArrow)
        return { part, value: values.year === null ? placeholder.getFullYear() : Math.max(1, values.year + delta) };
      if (isNumberKey(key)) {
        const r = updateYear(Number.parseInt(key, 10), values.year, state);
        if (r.moveToNext)
          ctx.focusNext();
        return { part, value: r.value };
      }
      return undefined;
    }
    case 'hour': {
      const is12 = resolveHourCycle(ctx.hourCycle, ctx.locale) === 12;
      if (isArrow) {
        const next = cycle(values.hour ?? null, delta, 0, 23, 23);
        return { part, value: next, dayPeriod: next >= 12 ? 'PM' : 'AM' };
      }
      if (isNumberKey(key)) {
        const displayMax = is12 ? 12 : 23;
        let displayPrev = values.hour ?? null;
        if (is12 && displayPrev !== null)
          displayPrev = displayPrev % 12 === 0 ? 0 : (displayPrev > 12 ? displayPrev - 12 : displayPrev);
        const r = updateCappedField(displayMax, Number.parseInt(key, 10), displayPrev, state, true);
        let internal = r.value;
        if (is12 && internal !== null) {
          const period = values.dayPeriod ?? 'AM';
          internal = internal === 12
            ? (period === 'AM' ? 0 : 12)
            : (period === 'PM' ? internal + 12 : internal);
        }
        if (r.moveToNext)
          ctx.focusNext();
        return { part, value: internal, dayPeriod: internal === null ? undefined : (internal >= 12 ? 'PM' : 'AM') };
      }
      return undefined;
    }
    case 'minute': {
      if (isArrow)
        return { part, value: cycle(values.minute ?? null, delta, 0, 59, 59) };
      if (isNumberKey(key)) {
        const r = updateCappedField(59, Number.parseInt(key, 10), values.minute ?? null, state, true);
        if (r.moveToNext)
          ctx.focusNext();
        return { part, value: r.value };
      }
      return undefined;
    }
    case 'second': {
      if (isArrow)
        return { part, value: cycle(values.second ?? null, delta, 0, 59, 59) };
      if (isNumberKey(key)) {
        const r = updateCappedField(59, Number.parseInt(key, 10), values.second ?? null, state, true);
        if (r.moveToNext)
          ctx.focusNext();
        return { part, value: r.value };
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

function applyDayPeriod(
  e: KeyboardEvent,
  values: SegmentValues,
): { part: 'dayPeriod'; value: DayPeriod; hour?: number } | undefined {
  const key = e.key;
  const current = values.dayPeriod ?? 'AM';
  const hour = values.hour ?? null;

  const setPeriod = (period: DayPeriod): { part: 'dayPeriod'; value: DayPeriod; hour?: number } => {
    if (hour === null)
      return { part: 'dayPeriod', value: period };
    if (period === 'PM' && hour < 12)
      return { part: 'dayPeriod', value: period, hour: hour + 12 };
    if (period === 'AM' && hour >= 12)
      return { part: 'dayPeriod', value: period, hour: hour - 12 };
    return { part: 'dayPeriod', value: period };
  };

  if (key === 'ArrowUp' || key === 'ArrowDown')
    return setPeriod(current === 'AM' ? 'PM' : 'AM');
  if (key === 'a' || key === 'A')
    return setPeriod('AM');
  if (key === 'p' || key === 'P')
    return setPeriod('PM');
  return undefined;
}

function deleteDigit(prev: number | string | null): number | null {
  if (prev === null || prev === undefined)
    return null;
  const str = prev.toString();
  if (str.length <= 1)
    return null;
  return Number.parseInt(str.slice(0, -1), 10);
}
