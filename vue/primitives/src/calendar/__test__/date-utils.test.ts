import { describe, expect, it } from 'vitest';
import {
  addMonths,
  getWeeks,
  isDateUnavailable,
  isSameDay,
  startOfWeek,
  toIsoDate,
} from '../date-utils';

describe('date-utils', () => {
  it('getWeeks returns 6 rows × 7 cols', () => {
    const weeks = getWeeks(new Date(2024, 0, 15), 0);
    expect(weeks).toHaveLength(6);
    for (const row of weeks)
      expect(row).toHaveLength(7);
  });

  it('startOfWeek respects weekStartsOn', () => {
    // 2024-01-10 is a Wednesday.
    const wed = new Date(2024, 0, 10);
    expect(startOfWeek(wed, 0).getDay()).toBe(0);
    expect(startOfWeek(wed, 1).getDay()).toBe(1);
  });

  it('addMonths clamps Jan 31 → Feb 28/29', () => {
    const r = addMonths(new Date(2023, 0, 31), 1);
    expect(r.getMonth()).toBe(1);
    expect(r.getDate()).toBe(28);
  });

  it('isSameDay ignores time component', () => {
    const a = new Date(2024, 5, 1, 1, 2, 3);
    const b = new Date(2024, 5, 1, 23, 59);
    expect(isSameDay(a, b)).toBe(true);
    expect(isSameDay(a, new Date(2024, 5, 2))).toBe(false);
  });

  it('toIsoDate formats from local date fields, regardless of timezone', () => {
    // toISOString would shift local midnight to the previous UTC day east of UTC.
    expect(toIsoDate(new Date(2026, 5, 15))).toBe('2026-06-15');
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toIsoDate(new Date(2026, 5, 15, 23, 59, 59))).toBe('2026-06-15');
  });

  it('isDateUnavailable honors min/max and predicate', () => {
    const min = new Date(2024, 0, 5);
    const max = new Date(2024, 0, 25);
    expect(isDateUnavailable(new Date(2024, 0, 1), undefined, min, max)).toBe(true);
    expect(isDateUnavailable(new Date(2024, 0, 31), undefined, min, max)).toBe(true);
    expect(isDateUnavailable(new Date(2024, 0, 10), undefined, min, max)).toBe(false);
    expect(isDateUnavailable(new Date(2024, 0, 10), d => d.getDate() === 10)).toBe(true);
  });
});
