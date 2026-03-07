import { describe, expect, it } from 'vitest';
import { QrSegment, makeNumeric, makeAlphanumeric, makeBytes } from '../segment';
import { MODE_ALPHANUMERIC, MODE_BYTE, MODE_NUMERIC } from '../constants';

describe('QrSegment', () => {
  it('throws on negative numChars', () => {
    expect(() => new QrSegment(MODE_BYTE, -1, [])).toThrow(RangeError);
  });

  it('accepts zero numChars', () => {
    const seg = new QrSegment(MODE_BYTE, 0, []);
    expect(seg.numChars).toBe(0);
    expect(seg.bitData).toEqual([]);
  });
});

describe('makeNumeric', () => {
  it('encodes a 5-digit string', () => {
    const seg = makeNumeric('12345');
    expect(seg.mode).toBe(MODE_NUMERIC);
    expect(seg.numChars).toBe(5);
    // "123" → 10 bits, "45" → 7 bits
    expect(seg.bitData).toHaveLength(17);
  });

  it('encodes a single digit', () => {
    const seg = makeNumeric('0');
    expect(seg.numChars).toBe(1);
    expect(seg.bitData).toHaveLength(4);
  });

  it('encodes an empty string', () => {
    const seg = makeNumeric('');
    expect(seg.numChars).toBe(0);
    expect(seg.bitData).toHaveLength(0);
  });

  it('throws on non-numeric input', () => {
    expect(() => makeNumeric('12a3')).toThrow(RangeError);
    expect(() => makeNumeric('hello')).toThrow(RangeError);
  });
});

describe('makeAlphanumeric', () => {
  it('encodes a character pair', () => {
    const seg = makeAlphanumeric('AB');
    expect(seg.mode).toBe(MODE_ALPHANUMERIC);
    expect(seg.numChars).toBe(2);
    // 1 pair → 11 bits
    expect(seg.bitData).toHaveLength(11);
  });

  it('encodes a pair plus remainder', () => {
    const seg = makeAlphanumeric('ABC');
    expect(seg.numChars).toBe(3);
    // 1 pair (11 bits) + 1 remainder (6 bits)
    expect(seg.bitData).toHaveLength(17);
  });

  it('throws on lowercase input', () => {
    expect(() => makeAlphanumeric('hello')).toThrow(RangeError);
  });

  it('throws on invalid characters', () => {
    expect(() => makeAlphanumeric('test@email')).toThrow(RangeError);
  });
});

describe('makeBytes', () => {
  it('encodes an empty array', () => {
    const seg = makeBytes([]);
    expect(seg.mode).toBe(MODE_BYTE);
    expect(seg.numChars).toBe(0);
    expect(seg.bitData).toHaveLength(0);
  });

  it('encodes two bytes', () => {
    const seg = makeBytes([0x48, 0x65]);
    expect(seg.numChars).toBe(2);
    expect(seg.bitData).toHaveLength(16);
  });

  it('encodes 0xFF correctly', () => {
    const seg = makeBytes([0xFF]);
    expect(seg.bitData).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('encodes 0x00 correctly', () => {
    const seg = makeBytes([0x00]);
    expect(seg.bitData).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
