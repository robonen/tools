import type { QrCodeEcc } from './types';
import { HIGH, MAX_VERSION, MEDIUM, MIN_VERSION, QUARTILE } from './constants';
import { QrCode } from './qr-code';
import { makeBytes, makeSegments } from './segment';
import type { QrSegment } from './segment';
import { appendBits, assert, getNumDataCodewords, getTotalBits, numCharCountBits } from './utils';

/**
 * Returns a QR Code representing the given Unicode text string at the given error correction level.
 * As a conservative upper bound, this function is guaranteed to succeed for strings that have 738 or fewer
 * Unicode code points (not UTF-16 code units) if the low error correction level is used.
 * The smallest possible QR Code version is automatically chosen for the output.
 */
export function encodeText(text: string, ecl: QrCodeEcc): QrCode {
  const segs = makeSegments(text);
  return encodeSegments(segs, ecl);
}

/**
 * Returns a QR Code representing the given binary data at the given error correction level.
 * This function always encodes using the binary segment mode, not any text mode.
 * The maximum number of bytes allowed is 2953.
 */
export function encodeBinary(data: Readonly<number[]>, ecl: QrCodeEcc): QrCode {
  const seg = makeBytes(data);
  return encodeSegments([seg], ecl);
}

/**
 * Returns a QR Code representing the given segments with the given encoding parameters.
 * The smallest possible QR Code version within the given range is automatically chosen for the output.
 * This is a mid-level API; the high-level API is encodeText() and encodeBinary().
 */
export function encodeSegments(
  segs: Readonly<QrSegment[]>,
  ecl: QrCodeEcc,
  minVersion = 1,
  maxVersion = 40,
  mask = -1,
  boostEcl = true,
): QrCode {
  if (!(MIN_VERSION <= minVersion && minVersion <= maxVersion && maxVersion <= MAX_VERSION)
    || mask < -1 || mask > 7)
    throw new RangeError('Invalid value');

  // Find the minimal version number to use
  let version: number;
  let dataUsedBits: number;
  for (version = minVersion; ; version++) {
    const dataCapacityBits = getNumDataCodewords(version, ecl) * 8;
    const usedBits = getTotalBits(segs, version);
    if (usedBits <= dataCapacityBits) {
      dataUsedBits = usedBits;
      break;
    }
    if (version >= maxVersion)
      throw new RangeError('Data too long');
  }

  // Increase the error correction level while the data still fits in the current version number
  for (const newEcl of [MEDIUM, QUARTILE, HIGH]) {
    if (boostEcl && dataUsedBits! <= getNumDataCodewords(version, newEcl) * 8)
      ecl = newEcl;
  }

  // Concatenate all segments to create the data bit string
  const bb: number[] = [];
  for (const seg of segs) {
    appendBits(seg.mode[0], 4, bb);
    appendBits(seg.numChars, numCharCountBits(seg.mode, version), bb);
    for (const b of seg.bitData)
      bb.push(b);
  }
  assert(bb.length === dataUsedBits!);

  // Add terminator and pad up to a byte if applicable
  const dataCapacityBits = getNumDataCodewords(version, ecl) * 8;
  assert(bb.length <= dataCapacityBits);
  appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
  appendBits(0, (8 - bb.length % 8) % 8, bb);
  assert(bb.length % 8 === 0);

  // Pad with alternating bytes until data capacity is reached
  for (let padByte = 0xEC; bb.length < dataCapacityBits; padByte ^= 0xEC ^ 0x11)
    appendBits(padByte, 8, bb);

  // Pack bits into bytes in big endian
  const dataCodewords = Array.from({ length: Math.ceil(bb.length / 8) }, () => 0);
  for (let i = 0; i < bb.length; i++)
    dataCodewords[i >>> 3]! |= bb[i]! << (7 - (i & 7));

  // Create the QR Code object
  return new QrCode(version, ecl, dataCodewords, mask);
}
