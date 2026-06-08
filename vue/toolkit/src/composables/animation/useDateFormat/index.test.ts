import { describe, expect, it } from 'vitest';
import { effectScope, ref } from 'vue';
import { formatDate, normalizeDate, useDateFormat } from '.';

// A fixed local date: 2024-03-09 18:07:05.042 (a Saturday).
function fixture(): Date {
  return new Date(2024, 2, 9, 18, 7, 5, 42);
}

describe(useDateFormat, () => {
  it('defaults to HH:mm:ss', () => {
    const formatted = useDateFormat(fixture());
    expect(formatted.value).toBe('18:07:05');
  });

  it('formats year/month/day tokens', () => {
    const date = fixture();
    expect(useDateFormat(date, 'YYYY-MM-DD').value).toBe('2024-03-09');
    expect(useDateFormat(date, 'YY/M/D').value).toBe('24/3/9');
  });

  it('formats time tokens including milliseconds and 12-hour', () => {
    const date = fixture();
    expect(useDateFormat(date, 'HH:mm:ss.SSS').value).toBe('18:07:05.042');
    expect(useDateFormat(date, 'h:mm').value).toBe('6:07');
    expect(useDateFormat(date, 'hh').value).toBe('06');
  });

  it('handles 12 -> 12 and 0 -> 12 for the h token', () => {
    expect(useDateFormat(new Date(2024, 0, 1, 0, 0, 0), 'h A').value).toBe('12 AM');
    expect(useDateFormat(new Date(2024, 0, 1, 12, 0, 0), 'h A').value).toBe('12 PM');
  });

  it('formats the meridiem variants', () => {
    const pm = fixture();
    expect(useDateFormat(pm, 'A').value).toBe('PM');
    expect(useDateFormat(pm, 'AA').value).toBe('P.M.');
    expect(useDateFormat(pm, 'a').value).toBe('pm');
    expect(useDateFormat(pm, 'aa').value).toBe('p.m.');

    const am = new Date(2024, 0, 1, 6, 0, 0);
    expect(useDateFormat(am, 'A').value).toBe('AM');
  });

  it('formats ordinal tokens', () => {
    const date = new Date(2024, 0, 1, 3, 0, 0); // Jan 1st, 3 o'clock
    expect(useDateFormat(date, 'Do').value).toBe('1st');
    expect(useDateFormat(date, 'Mo').value).toBe('1st');
    expect(useDateFormat(new Date(2024, 1, 22), 'Do').value).toBe('22nd');
    expect(useDateFormat(new Date(2024, 1, 23), 'Do').value).toBe('23rd');
    expect(useDateFormat(new Date(2024, 1, 11), 'Do').value).toBe('11th');
  });

  it('formats localized weekday and month with the locales option', () => {
    const date = fixture(); // a Saturday in March
    expect(useDateFormat(date, 'dddd', { locales: 'en-US' }).value).toBe('Saturday');
    expect(useDateFormat(date, 'ddd', { locales: 'en-US' }).value).toBe('Sat');
    expect(useDateFormat(date, 'MMMM', { locales: 'en-US' }).value).toBe('March');
    expect(useDateFormat(date, 'MMM', { locales: 'en-US' }).value).toBe('Mar');
    expect(useDateFormat(date, 'd', { locales: 'en-US' }).value).toBe('6'); // Saturday
  });

  it('uses a custom meridiem function', () => {
    const date = fixture();
    const formatted = useDateFormat(date, 'h:mm a', {
      customMeridiem: hours => (hours < 12 ? 'morning' : 'evening'),
    });
    expect(formatted.value).toBe('6:07 evening');
  });

  it('emits [literal] escapes verbatim', () => {
    const date = fixture();
    expect(useDateFormat(date, '[Year:] YYYY').value).toBe('Year: 2024');
    expect(useDateFormat(date, '[YYYY] YYYY').value).toBe('YYYY 2024');
  });

  it('is reactive to the date, format, and locale', () => {
    const date = ref<Date>(fixture());
    const format = ref('YYYY');
    const locale = ref('en-US');
    const formatted = useDateFormat(date, format, { locales: locale });

    expect(formatted.value).toBe('2024');

    date.value = new Date(2025, 0, 1);
    expect(formatted.value).toBe('2025');

    format.value = 'MMMM';
    expect(formatted.value).toBe('January');

    locale.value = 'fr-FR';
    expect(formatted.value).toBe('janvier');
  });

  it('accepts a numeric timestamp and a getter', () => {
    const date = fixture();
    expect(useDateFormat(date.getTime(), 'YYYY-MM-DD').value).toBe('2024-03-09');
    expect(useDateFormat(() => date, 'YYYY').value).toBe('2024');
  });

  it('parses loose date strings without a trailing Z', () => {
    expect(useDateFormat('2024-03-09', 'YYYY-MM-DD').value).toBe('2024-03-09');
    expect(useDateFormat('2024-3', 'YYYY-MM-DD').value).toBe('2024-03-01');
    expect(useDateFormat('2024-03-09 18:07:05', 'HH:mm:ss').value).toBe('18:07:05');
  });

  it('handles null/undefined by resolving to now without throwing', () => {
    expect(useDateFormat(undefined, 'YYYY').value).toMatch(/^\d{4}$/);
    expect(useDateFormat(null, 'YYYY').value).toMatch(/^\d{4}$/);
  });

  it('returns "Invalid Date" for unparseable input instead of NaN tokens', () => {
    expect(useDateFormat('not a date', 'YYYY-MM-DD').value).toBe('Invalid Date');
    expect(useDateFormat(Number.NaN, 'HH:mm:ss').value).toBe('Invalid Date');
  });

  it('constructs inside an effect scope without throwing (SSR-safe, no global access)', () => {
    const scope = effectScope();
    let formatted: ReturnType<typeof useDateFormat> | undefined;

    scope.run(() => {
      formatted = useDateFormat(fixture(), 'YYYY-MM-DD');
    });

    expect(formatted?.value).toBe('2024-03-09');
    scope.stop();
  });
});

describe(formatDate, () => {
  it('formats a date one-shot', () => {
    expect(formatDate(fixture(), 'YYYY/MM/DD')).toBe('2024/03/09');
  });

  it('returns "Invalid Date" for an invalid date', () => {
    expect(formatDate(new Date(Number.NaN), 'YYYY')).toBe('Invalid Date');
  });
});

describe(normalizeDate, () => {
  it('returns a fresh Date for a Date input', () => {
    const date = fixture();
    const normalized = normalizeDate(date);
    expect(normalized).not.toBe(date);
    expect(normalized.getTime()).toBe(date.getTime());
  });

  it('resolves null/undefined to a valid current Date', () => {
    expect(Number.isNaN(normalizeDate(undefined).getTime())).toBeFalsy();
    expect(Number.isNaN(normalizeDate(null).getTime())).toBeFalsy();
  });

  it('parses a numeric timestamp', () => {
    const date = fixture();
    expect(normalizeDate(date.getTime()).getTime()).toBe(date.getTime());
  });
});
