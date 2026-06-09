import { describe, expect, it } from 'vitest';
import { luhn } from '@robonen/encoding';
import { isValidCardNumber } from './validate';

describe(isValidCardNumber, () => {
  it('requires a valid checksum and a brand-matching length', () => {
    expect(isValidCardNumber('4111 1111 1111 1111')).toBe(true); // visa, 16
    expect(isValidCardNumber('371449635398431')).toBe(true); // amex, 15
  });

  it('rejects a Luhn-valid number outside the valid length range', () => {
    expect(luhn('79927398713')).toBe(true); // Luhn-valid…
    expect(isValidCardNumber('79927398713')).toBe(false); // …but only 11 digits
  });

  it('rejects a bad checksum', () => {
    expect(isValidCardNumber('4111 1111 1111 1112')).toBe(false);
  });
});
