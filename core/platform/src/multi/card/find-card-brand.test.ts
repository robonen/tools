import { describe, expect, it } from 'vitest';
import { CARD_BRANDS } from './card-brands';
import { findCardBrand } from './find-card-brand';

describe(findCardBrand, () => {
  it('detects major brands by IIN', () => {
    expect(findCardBrand('4111111111111111')?.brand).toBe('visa');
    expect(findCardBrand('5500005555555559')?.brand).toBe('mastercard');
    expect(findCardBrand('2221001234567890')?.brand).toBe('mastercard'); // 2-series
    expect(findCardBrand('371449635398431')?.brand).toBe('american-express');
    expect(findCardBrand('30569309025904')?.brand).toBe('diners-club');
    expect(findCardBrand('6011000990139424')?.brand).toBe('discover');
    expect(findCardBrand('2200123412341234')?.brand).toBe('mir');
  });

  it('narrows down as digits are typed', () => {
    expect(findCardBrand('4')?.brand).toBe('visa');
  });

  it('exposes a template, lengths and security code for every brand', () => {
    expect(CARD_BRANDS.length).toBeGreaterThan(5);
    for (const brand of CARD_BRANDS) {
      expect(brand.template).toMatch(/#/);
      expect(brand.lengths.length).toBeGreaterThan(0);
      expect(brand.code.size).toBeGreaterThan(0);
    }
  });

  it('returns undefined for empty or unknown input', () => {
    expect(findCardBrand('')).toBeUndefined();
    expect(findCardBrand('0000')).toBeUndefined();
  });
});
