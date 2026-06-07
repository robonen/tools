export interface BitVectorLike {
  getBit(index: number): boolean;
  setBit(index: number): void;
  clearBit(index: number): void;
  toggleBit(index: number): void;
  previousBit(index: number): number;
  nextBit(index: number): number;
  count(): number;
}

/**
 * @name BitVector
 * @category Bits
 * @description A bit vector is a vector of bits that can be used to store a collection of bits
 *
 * @since 0.0.3
 */
export class BitVector extends Uint8Array implements BitVectorLike {
  constructor(size: number) {
    super(Math.ceil(size / 8));
  }

  getBit(index: number) {
    const value = this[index >> 3]! & (1 << (index & 7));
    return value !== 0;
  }

  setBit(index: number) {
    this[index >> 3]! |= 1 << (index & 7);
  }

  clearBit(index: number): void {
    this[index >> 3]! &= ~(1 << (index & 7));
  }

  toggleBit(index: number): void {
    this[index >> 3]! ^= 1 << (index & 7);
  }

  previousBit(index: number): number {
    // Clamp an out-of-range start to the vector's bit length so a query past the end
    // returns the last set bit (or -1) instead of falling through to the invariant throw.
    const totalBits = this.length << 3;

    if (index > totalBits)
      index = totalBits;

    while (index !== ((index >> 3) << 3)) {
      --index;

      if (this.getBit(index)) {
        return index;
      }
    }

    let byteIndex = (index >> 3) - 1;

    while (byteIndex >= 0 && this[byteIndex] === 0)
      --byteIndex;

    if (byteIndex < 0)
      return -1;

    index = (byteIndex << 3) + 7;

    while (index >= (byteIndex << 3)) {
      if (this.getBit(index))
        return index;

      --index;
    }

    throw new RangeError('Unreachable value');
  }

  nextBit(index: number): number {
    const totalBits = this.length << 3;

    let i = index + 1;

    if (i < 0)
      i = 0;

    // Finish scanning the remainder of the starting byte.
    while (i < totalBits && (i & 7) !== 0) {
      if (this.getBit(i))
        return i;

      ++i;
    }

    // Skip over fully-empty bytes.
    let byteIndex = i >> 3;

    while (byteIndex < this.length && this[byteIndex] === 0)
      ++byteIndex;

    if (byteIndex >= this.length)
      return -1;

    i = byteIndex << 3;

    const end = i + 8;

    while (i < end) {
      if (this.getBit(i))
        return i;

      ++i;
    }

    throw new RangeError('Unreachable value');
  }

  count(): number {
    let total = 0;
    const len = this.length;

    // Indexed loop — the typed-array iterator protocol (for...of) is ~3.5x slower here.
    for (let i = 0; i < len; i++) {
      // Brian Kernighan's algorithm: iterate once per set bit.
      let byte = this[i]!;

      while (byte !== 0) {
        byte &= byte - 1;
        ++total;
      }
    }

    return total;
  }
}
