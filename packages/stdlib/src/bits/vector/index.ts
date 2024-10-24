export interface BitVector {
  getBit(index: number): boolean;
  setBit(index: number): void;
  clearBit(index: number): void;
  previousBit(index: number): number;
}

/**
 * @name BitVector
 * @category Bits
 * @description A bit vector is a vector of bits that can be used to store a collection of bits
 * 
 * @since 0.0.3
 */
export class BitVector extends Uint8Array implements BitVector {
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

  previousBit(index: number): number {
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
}