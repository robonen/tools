import { describe, expect, it } from 'vitest';
import { getCountryFlagByCode } from './flag';

describe(getCountryFlagByCode, () => {
  it('maps alpha-2 codes to flag emoji', () => {
    expect(getCountryFlagByCode('US')).toBe('🇺🇸');
    expect(getCountryFlagByCode('UA')).toBe('🇺🇦');
    expect(getCountryFlagByCode('GB')).toBe('🇬🇧');
  });

  it('is case-insensitive', () => {
    expect(getCountryFlagByCode('gb')).toBe(getCountryFlagByCode('GB'));
  });

  it('returns an empty string for invalid input', () => {
    expect(getCountryFlagByCode('1')).toBe('');
    expect(getCountryFlagByCode('USA')).toBe('');
    expect(getCountryFlagByCode('u')).toBe('');
    expect(getCountryFlagByCode('')).toBe('');
  });
});
