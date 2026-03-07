import { describe, expect, it } from 'vitest';
import { appendBits, getBit, getNumDataCodewords, getNumRawDataModules, getTotalBits, numCharCountBits } from '../utils';
import { HIGH, LOW, MODE_BYTE, MODE_NUMERIC } from '../constants';
import { QrSegment } from '../segment';

describe('appendBits', () => {
  it('appends nothing when len is 0', () => {
    const bb: number[] = [];
    appendBits(0, 0, bb);
    expect(bb).toEqual([]);
  });

  it('appends bits in MSB-first order', () => {
    const bb: number[] = [];
    appendBits(0b101, 3, bb);
    expect(bb).toEqual([1, 0, 1]);
  });

  it('appends to an existing array', () => {
    const bb = [1, 0];
    appendBits(0b11, 2, bb);
    expect(bb).toEqual([1, 0, 1, 1]);
  });

  it('throws when value exceeds bit length', () => {
    expect(() => appendBits(5, 2, [])).toThrow(RangeError);
  });

  it('throws on negative length', () => {
    expect(() => appendBits(0, -1, [])).toThrow(RangeError);
  });
});

describe('getBit', () => {
  it('returns correct bits for 0b10110', () => {
    expect(getBit(0b10110, 0)).toBe(false);
    expect(getBit(0b10110, 1)).toBe(true);
    expect(getBit(0b10110, 2)).toBe(true);
    expect(getBit(0b10110, 3)).toBe(false);
    expect(getBit(0b10110, 4)).toBe(true);
  });

  it('returns false for high bits of a small number', () => {
    expect(getBit(1, 7)).toBe(false);
    expect(getBit(1, 31)).toBe(false);
  });
});

describe('getNumRawDataModules', () => {
  it('returns 208 for version 1', () => {
    expect(getNumRawDataModules(1)).toBe(208);
  });

  it('returns correct value for version 2 (with alignment)', () => {
    expect(getNumRawDataModules(2)).toBe(359);
  });

  it('returns correct value for version 7 (with version info)', () => {
    expect(getNumRawDataModules(7)).toBe(1568);
  });

  it('returns 29648 for version 40', () => {
    expect(getNumRawDataModules(40)).toBe(29648);
  });

  it('throws on version 0', () => {
    expect(() => getNumRawDataModules(0)).toThrow(RangeError);
  });

  it('throws on version 41', () => {
    expect(() => getNumRawDataModules(41)).toThrow(RangeError);
  });
});

describe('getNumDataCodewords', () => {
  it('returns 19 for version 1 LOW', () => {
    expect(getNumDataCodewords(1, LOW)).toBe(19);
  });

  it('returns 9 for version 1 HIGH', () => {
    expect(getNumDataCodewords(1, HIGH)).toBe(9);
  });
});

describe('getTotalBits', () => {
  it('returns 0 for empty segments', () => {
    expect(getTotalBits([], 1)).toBe(0);
  });

  it('returns Infinity when numChars overflows char count field', () => {
    // MODE_BYTE at v1 has ccbits=8, so numChars=256 overflows
    const seg = new QrSegment(MODE_BYTE, 256, []);
    expect(getTotalBits([seg], 1)).toBe(Number.POSITIVE_INFINITY);
  });

  it('calculates total bits for a single segment', () => {
    // MODE_BYTE at v1: 4 (mode) + 8 (char count) + 8 (data) = 20
    const seg = new QrSegment(MODE_BYTE, 1, [0, 0, 0, 0, 0, 0, 0, 0]);
    expect(getTotalBits([seg], 1)).toBe(20);
  });
});

describe('numCharCountBits', () => {
  it('returns correct bits for MODE_NUMERIC across version ranges', () => {
    expect(numCharCountBits(MODE_NUMERIC, 1)).toBe(10);
    expect(numCharCountBits(MODE_NUMERIC, 9)).toBe(10);
    expect(numCharCountBits(MODE_NUMERIC, 10)).toBe(12);
    expect(numCharCountBits(MODE_NUMERIC, 26)).toBe(12);
    expect(numCharCountBits(MODE_NUMERIC, 27)).toBe(14);
    expect(numCharCountBits(MODE_NUMERIC, 40)).toBe(14);
  });

  it('returns correct bits for MODE_BYTE across version ranges', () => {
    expect(numCharCountBits(MODE_BYTE, 1)).toBe(8);
    expect(numCharCountBits(MODE_BYTE, 9)).toBe(8);
    expect(numCharCountBits(MODE_BYTE, 10)).toBe(16);
    expect(numCharCountBits(MODE_BYTE, 40)).toBe(16);
  });
});
