import type { QrCodeEcc, QrSegmentMode } from './types';
import { ECC_CODEWORDS_PER_BLOCK, MAX_VERSION, MIN_VERSION, NUM_ERROR_CORRECTION_BLOCKS } from './constants';
import type { QrSegment } from './segment';

const utf8Encoder = new TextEncoder();

/** Appends the given number of low-order bits of the given value to the buffer. */
export function appendBits(val: number, len: number, bb: number[]): void {
  if (len < 0 || len > 31 || val >>> len !== 0)
    throw new RangeError('Value out of range');
  for (let i = len - 1; i >= 0; i--)
    bb.push((val >>> i) & 1);
}

/** Returns true iff the i'th bit of x is set to 1. */
export function getBit(x: number, i: number): boolean {
  return ((x >>> i) & 1) !== 0;
}

/** Throws an exception if the given condition is false. */
export function assert(cond: boolean): asserts cond {
  if (!cond)
    throw new Error('Assertion error');
}

/** Returns a Uint8Array representing the given string encoded in UTF-8. */
export function toUtf8ByteArray(str: string): Uint8Array {
  return utf8Encoder.encode(str);
}

/** Returns the bit width of the character count field for a segment in this mode at the given version number. */
export function numCharCountBits(mode: QrSegmentMode, ver: number): number {
  return mode[((ver + 7) / 17 | 0) + 1]!;
}

/**
 * Returns the number of data bits that can be stored in a QR Code of the given version number,
 * after all function modules are excluded. This includes remainder bits, so it might not be a multiple of 8.
 * The result is in the range [208, 29648].
 */
export function getNumRawDataModules(ver: number): number {
  if (ver < MIN_VERSION || ver > MAX_VERSION)
    throw new RangeError('Version number out of range');

  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = (ver / 7 | 0) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7)
      result -= 36;
  }
  assert(result >= 208 && result <= 29648);
  return result;
}

/**
 * Returns the number of 8-bit data (i.e. not error correction) codewords contained in any
 * QR Code of the given version number and error correction level, with remainder bits discarded.
 */
export function getNumDataCodewords(ver: number, ecl: QrCodeEcc): number {
  return (getNumRawDataModules(ver) / 8 | 0)
    - ECC_CODEWORDS_PER_BLOCK[ecl[0]]![ver]!
    * NUM_ERROR_CORRECTION_BLOCKS[ecl[0]]![ver]!;
}

/**
 * Calculates and returns the number of bits needed to encode the given segments at the given version.
 * The result is infinity if a segment has too many characters to fit its length field.
 */
export function getTotalBits(segs: Readonly<QrSegment[]>, version: number): number {
  let result = 0;
  for (const seg of segs) {
    const ccbits = numCharCountBits(seg.mode, version);
    if (seg.numChars >= (1 << ccbits))
      return Number.POSITIVE_INFINITY;
    result += 4 + ccbits + seg.bitData.length;
  }
  return result;
}
