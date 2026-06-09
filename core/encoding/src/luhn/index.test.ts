import { describe, expect, it } from 'vitest';
import { luhn } from './index';

describe(luhn, () => {
  it('passes valid checksums (separators ignored)', () => {
    expect(luhn('4111 1111 1111 1111')).toBe(true);
    expect(luhn('5500005555555559')).toBe(true);
    expect(luhn('371449635398431')).toBe(true);
    expect(luhn('79927398713')).toBe(true); // classic Luhn example
  });

  it('fails bad checksums', () => {
    expect(luhn('4111 1111 1111 1112')).toBe(false);
    expect(luhn('79927398710')).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(luhn('')).toBe(false);
    expect(luhn('----')).toBe(false);
  });
});
