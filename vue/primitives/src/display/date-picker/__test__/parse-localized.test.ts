import { describe, expect, it } from 'vitest';
import { nativeDateAdapter } from '../../../utilities/config-provider/date-adapter';
import { parseLocalizedDate } from '../parse-localized';

const NUMERIC: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };

function ymd(date: Date | null): [number, number, number] | null {
  return date ? [date.getFullYear(), date.getMonth() + 1, date.getDate()] : null;
}

describe(parseLocalizedDate, () => {
  it('follows the locale part order', () => {
    expect(ymd(parseLocalizedDate('05.06.2023', 'ru', NUMERIC, nativeDateAdapter))).toEqual([2023, 6, 5]);
    expect(ymd(parseLocalizedDate('06/05/2023', 'en-US', NUMERIC, nativeDateAdapter))).toEqual([2023, 6, 5]);
    expect(ymd(parseLocalizedDate('2023-06-05', 'sv-SE', NUMERIC, nativeDateAdapter))).toEqual([2023, 6, 5]);
  });

  it('accepts unpadded groups and two-digit years', () => {
    expect(ymd(parseLocalizedDate('5.6.23', 'de-DE', NUMERIC, nativeDateAdapter))).toEqual([2023, 6, 5]);
    expect(ymd(parseLocalizedDate('5.6.85', 'de-DE', NUMERIC, nativeDateAdapter))).toEqual([1985, 6, 5]);
  });

  it('rejects impossible dates instead of rolling them over', () => {
    expect(parseLocalizedDate('31.02.2023', 'ru', NUMERIC, nativeDateAdapter)).toBeNull();
    expect(parseLocalizedDate('05.13.2023', 'ru', NUMERIC, nativeDateAdapter)).toBeNull();
  });

  it('gives up on text it cannot map onto the numeric parts', () => {
    expect(parseLocalizedDate('tomorrow', 'en', NUMERIC, nativeDateAdapter)).toBeNull();
    expect(parseLocalizedDate('5 июня 2023', 'ru', { year: 'numeric', month: 'long', day: 'numeric' }, nativeDateAdapter)).toBeNull();
  });
});
