import type { QrSegmentMode } from './types';
import { ALPHANUMERIC_MAP, ALPHANUMERIC_REGEX, MODE_ALPHANUMERIC, MODE_BYTE, MODE_NUMERIC, NUMERIC_REGEX } from './constants';
import { appendBits, toUtf8ByteArray } from './utils';

/**
 * A segment of character/binary/control data in a QR Code symbol.
 * Instances of this class are immutable.
 */
export class QrSegment {
  public constructor(
    /** The mode indicator of this segment. */
    public readonly mode: QrSegmentMode,
    /** The length of this segment's unencoded data. */
    public readonly numChars: number,
    /** The data bits of this segment. */
    public readonly bitData: readonly number[],
  ) {
    if (numChars < 0)
      throw new RangeError('Invalid argument');
  }
}

/** Returns a segment representing the given binary data encoded in byte mode. */
export function makeBytes(data: ArrayLike<number>): QrSegment {
  const bb: number[] = [];
  for (let i = 0, len = data.length; i < len; i++)
    appendBits(data[i]!, 8, bb);
  return new QrSegment(MODE_BYTE, data.length, bb);
}

/** Returns a segment representing the given string of decimal digits encoded in numeric mode. */
export function makeNumeric(digits: string): QrSegment {
  if (!isNumeric(digits))
    throw new RangeError('String contains non-numeric characters');
  const bb: number[] = [];
  for (let i = 0; i < digits.length;) {
    const n = Math.min(digits.length - i, 3);
    appendBits(Number.parseInt(digits.slice(i, i + n), 10), n * 3 + 1, bb);
    i += n;
  }
  return new QrSegment(MODE_NUMERIC, digits.length, bb);
}

/** Returns a segment representing the given text string encoded in alphanumeric mode. */
export function makeAlphanumeric(text: string): QrSegment {
  if (!isAlphanumeric(text))
    throw new RangeError('String contains unencodable characters in alphanumeric mode');
  const bb: number[] = [];
  let i: number;
  for (i = 0; i + 2 <= text.length; i += 2) {
    let temp = ALPHANUMERIC_MAP[text.charCodeAt(i)]! * 45;
    temp += ALPHANUMERIC_MAP[text.charCodeAt(i + 1)]!;
    appendBits(temp, 11, bb);
  }
  if (i < text.length)
    appendBits(ALPHANUMERIC_MAP[text.charCodeAt(i)]!, 6, bb);
  return new QrSegment(MODE_ALPHANUMERIC, text.length, bb);
}

/**
 * Returns a new mutable list of zero or more segments to represent the given Unicode text string.
 * The result may use various segment modes and switch modes to optimize the length of the bit stream.
 */
export function makeSegments(text: string): QrSegment[] {
  if (text === '')
    return [];
  if (isNumeric(text))
    return [makeNumeric(text)];
  if (isAlphanumeric(text))
    return [makeAlphanumeric(text)];
  return [makeBytes(toUtf8ByteArray(text))];
}

/** Tests whether the given string can be encoded as a segment in numeric mode. */
export function isNumeric(text: string): boolean {
  return NUMERIC_REGEX.test(text);
}

/** Tests whether the given string can be encoded as a segment in alphanumeric mode. */
export function isAlphanumeric(text: string): boolean {
  return ALPHANUMERIC_REGEX.test(text);
}
