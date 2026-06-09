import { describe, expect, it } from 'vitest';
import { findPhoneCountry } from './find-phone-country';
import { PHONE_COUNTRIES } from './phone-countries';

describe(findPhoneCountry, () => {
  it('every dialing code is prefix-free', () => {
    const codes = PHONE_COUNTRIES.map(country => country.code);
    expect(codes.some(a => codes.some(b => a !== b && b.startsWith(a)))).toBe(false);
  });

  it('returns the primary country for a shared code when no area code matches', () => {
    expect(findPhoneCountry('12025550123')?.iso2).toBe('us');
    expect(findPhoneCountry('74951234567')?.iso2).toBe('ru');
  });

  it('disambiguates a shared code by area code', () => {
    expect(findPhoneCountry('14165550123')?.iso2).toBe('ca'); // +1 416 → Canada
    expect(findPhoneCountry('12425550123')?.iso2).toBe('bs'); // +1 242 → Bahamas
    expect(findPhoneCountry('73101234567')?.iso2).toBe('kz'); // +7 310 → Kazakhstan
  });

  it('matches a unique long code', () => {
    expect(findPhoneCountry('380441234567')?.iso2).toBe('ua');
  });

  it('returns undefined for empty or unknown input', () => {
    expect(findPhoneCountry('')).toBeUndefined();
    expect(findPhoneCountry('000')).toBeUndefined();
  });
});
