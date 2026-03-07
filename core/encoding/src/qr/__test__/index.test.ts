import { describe, expect, it } from 'vitest';
import { encodeText, encodeBinary, encodeSegments, makeSegments, isNumeric, isAlphanumeric, QrCode, QrCodeDataType, EccMap, LOW, MEDIUM, QUARTILE, HIGH } from '..';

describe('isNumeric', () => {
  it('accepts pure digit strings', () => {
    expect(isNumeric('0123456789')).toBe(true);
    expect(isNumeric('0')).toBe(true);
    expect(isNumeric('')).toBe(true);
  });

  it('rejects non-digit characters', () => {
    expect(isNumeric('12a3')).toBe(false);
    expect(isNumeric('HELLO')).toBe(false);
    expect(isNumeric('12 34')).toBe(false);
  });
});

describe('isAlphanumeric', () => {
  it('accepts valid alphanumeric strings', () => {
    expect(isAlphanumeric('HELLO WORLD')).toBe(true);
    expect(isAlphanumeric('0123456789')).toBe(true);
    expect(isAlphanumeric('ABC123')).toBe(true);
    expect(isAlphanumeric('')).toBe(true);
  });

  it('rejects lowercase and special characters', () => {
    expect(isAlphanumeric('hello')).toBe(false);
    expect(isAlphanumeric('Hello')).toBe(false);
    expect(isAlphanumeric('test@email')).toBe(false);
  });
});

describe('makeSegments', () => {
  it('returns empty array for empty string', () => {
    expect(makeSegments('')).toEqual([]);
  });

  it('selects numeric mode for digit strings', () => {
    const segs = makeSegments('12345');
    expect(segs).toHaveLength(1);
    expect(segs[0]!.mode[0]).toBe(0x1); // MODE_NUMERIC
  });

  it('selects alphanumeric mode for uppercase strings', () => {
    const segs = makeSegments('HELLO WORLD');
    expect(segs).toHaveLength(1);
    expect(segs[0]!.mode[0]).toBe(0x2); // MODE_ALPHANUMERIC
  });

  it('selects byte mode for general text', () => {
    const segs = makeSegments('Hello, World!');
    expect(segs).toHaveLength(1);
    expect(segs[0]!.mode[0]).toBe(0x4); // MODE_BYTE
  });
});

describe('encodeText', () => {
  it('encodes short text at LOW ECC', () => {
    const qr = encodeText('Hello', LOW);
    expect(qr).toBeInstanceOf(QrCode);
    expect(qr.version).toBeGreaterThanOrEqual(1);
    expect(qr.size).toBe(qr.version * 4 + 17);
    expect(qr.mask).toBeGreaterThanOrEqual(0);
    expect(qr.mask).toBeLessThanOrEqual(7);
  });

  it('encodes text at different ECC levels', () => {
    const qrL = encodeText('Test', LOW);
    const qrM = encodeText('Test', MEDIUM);
    const qrH = encodeText('Test', HIGH);

    // Higher ECC needs same or higher version
    expect(qrH.version).toBeGreaterThanOrEqual(qrL.version);
    // All produce valid sizes
    for (const qr of [qrL, qrM, qrH]) {
      expect(qr.size).toBe(qr.version * 4 + 17);
    }
  });

  it('encodes numeric-only text', () => {
    const qr = encodeText('123456789012345', LOW);
    expect(qr.version).toBe(1); // Numeric mode is compact
  });

  it('encodes a URL', () => {
    const qr = encodeText('https://example.com/path?query=value', LOW);
    expect(qr).toBeInstanceOf(QrCode);
    expect(qr.size).toBeGreaterThanOrEqual(21);
  });

  it('encodes long text', () => {
    const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.';
    const qr = encodeText(longText, LOW);
    expect(qr).toBeInstanceOf(QrCode);
  });

  it('throws for data too long', () => {
    const tooLong = 'A'.repeat(10000);
    expect(() => encodeText(tooLong, HIGH)).toThrow(RangeError);
  });
});

describe('encodeBinary', () => {
  it('encodes binary data', () => {
    const data = [0x00, 0xFF, 0x48, 0x65, 0x6C, 0x6C, 0x6F];
    const qr = encodeBinary(data, LOW);
    expect(qr).toBeInstanceOf(QrCode);
  });
});

describe('QrCode', () => {
  it('modules grid has correct dimensions', () => {
    const qr = encodeText('Test', LOW);
    // Flat Uint8Array grid, verify via getModule
    expect(qr.size).toBeGreaterThanOrEqual(21);
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        const mod = qr.getModule(x, y);
        expect(typeof mod).toBe('boolean');
      }
    }
  });

  it('types grid has correct dimensions', () => {
    const qr = encodeText('Test', LOW);
    // Flat Int8Array grid, verify via getType
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        const t = qr.getType(x, y);
        expect(typeof t).toBe('number');
      }
    }
  });

  it('getModule returns false for out of bounds', () => {
    const qr = encodeText('Test', LOW);
    expect(qr.getModule(-1, 0)).toBe(false);
    expect(qr.getModule(0, -1)).toBe(false);
    expect(qr.getModule(qr.size, 0)).toBe(false);
    expect(qr.getModule(0, qr.size)).toBe(false);
  });

  it('produces deterministic output', () => {
    const qr1 = encodeText('Hello', LOW);
    const qr2 = encodeText('Hello', LOW);
    expect(qr1.version).toBe(qr2.version);
    expect(qr1.mask).toBe(qr2.mask);
    for (let y = 0; y < qr1.size; y++) {
      for (let x = 0; x < qr1.size; x++) {
        expect(qr1.getModule(x, y)).toBe(qr2.getModule(x, y));
      }
    }
  });

  it('different inputs produce different outputs', () => {
    const qr1 = encodeText('Hello', LOW);
    const qr2 = encodeText('World', LOW);
    // They might have the same version/size but different modules
    let hasDiff = false;
    for (let y = 0; y < qr1.size && !hasDiff; y++) {
      for (let x = 0; x < qr1.size && !hasDiff; x++) {
        if (qr1.getModule(x, y) !== qr2.getModule(x, y))
          hasDiff = true;
      }
    }
    expect(hasDiff).toBe(true);
  });
});

describe('EccMap', () => {
  it('has all four levels', () => {
    expect(EccMap.L).toBeDefined();
    expect(EccMap.M).toBeDefined();
    expect(EccMap.Q).toBeDefined();
    expect(EccMap.H).toBeDefined();
  });

  it('works with encodeText', () => {
    const qr = encodeText('Test', EccMap.L);
    expect(qr).toBeInstanceOf(QrCode);
  });
});

describe('encodeSegments', () => {
  it('uses explicit mask when specified', () => {
    const qr = encodeSegments(makeSegments('Test'), LOW, 1, 40, 3);
    expect(qr.mask).toBe(3);
  });

  it('preserves ECC level when boostEcl is false', () => {
    const qr = encodeSegments(makeSegments('Test'), LOW, 1, 40, -1, false);
    expect(qr.ecc).toBe(LOW);
  });

  it('boosts ECC level by default when data fits', () => {
    const qr = encodeSegments(makeSegments('Test'), LOW);
    expect(qr.ecc).toBe(HIGH);
  });

  it('forces a specific version when min equals max', () => {
    const qr = encodeSegments(makeSegments('Test'), LOW, 5, 5);
    expect(qr.version).toBe(5);
  });

  it('throws on invalid version range', () => {
    expect(() => encodeSegments(makeSegments('Test'), LOW, 2, 1)).toThrow(RangeError);
  });

  it('throws on invalid mask value', () => {
    expect(() => encodeSegments(makeSegments('Test'), LOW, 1, 40, 8)).toThrow(RangeError);
  });
});

describe('encodeBinary edge cases', () => {
  it('encodes an empty array', () => {
    const qr = encodeBinary([], LOW);
    expect(qr).toBeInstanceOf(QrCode);
  });
});

describe('encodeText edge cases', () => {
  it('encodes Unicode emoji text', () => {
    const qr = encodeText('Hello \uD83C\uDF0D', LOW);
    expect(qr).toBeInstanceOf(QrCode);
    expect(qr.size).toBeGreaterThanOrEqual(21);
  });

  it('uses compact encoding for alphanumeric text', () => {
    const qr = encodeText('HELLO WORLD', LOW);
    expect(qr.version).toBe(1);
  });

  it('selects version >= 7 for long data (triggers drawVersion)', () => {
    const qr = encodeText('a'.repeat(200), LOW);
    expect(qr.version).toBeGreaterThanOrEqual(7);
  });
});

describe('getType semantics', () => {
  it('identifies finder pattern modules as Position', () => {
    const qr = encodeText('Test', LOW);
    // Top-left finder pattern
    expect(qr.getType(0, 0)).toBe(QrCodeDataType.Position);
    expect(qr.getType(3, 3)).toBe(QrCodeDataType.Position);
    expect(qr.getType(6, 6)).toBe(QrCodeDataType.Position);
    // Top-right finder pattern
    expect(qr.getType(qr.size - 1, 0)).toBe(QrCodeDataType.Position);
    // Bottom-left finder pattern
    expect(qr.getType(0, qr.size - 1)).toBe(QrCodeDataType.Position);
  });

  it('identifies timing pattern modules as Timing', () => {
    const qr = encodeText('Test', LOW);
    // Horizontal timing row y=6, between finders
    expect(qr.getType(8, 6)).toBe(QrCodeDataType.Timing);
  });
});
