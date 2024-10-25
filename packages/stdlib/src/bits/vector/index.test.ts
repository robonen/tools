import { describe, it, expect } from 'vitest';
import { BitVector } from '.';

describe('BitVector', () => {
  it('should initialize with the correct size', () => {
    const size = 16;
    const expectedSize = Math.ceil(size / 8);
    const bitVector = new BitVector(size);

    expect(bitVector.length).toBe(expectedSize);
  });

  it('should set and get bits correctly', () => {
    const bitVector = new BitVector(16);
    bitVector.setBit(5);
    
    expect(bitVector.getBit(5)).toBe(true);
    expect(bitVector.getBit(4)).toBe(false);
  });

  it('should clear bits correctly', () => {
    const bitVector = new BitVector(16);
    bitVector.setBit(5);

    expect(bitVector.getBit(5)).toBe(true);

    bitVector.clearBit(5);

    expect(bitVector.getBit(5)).toBe(false);
  });

  it('should find the previous bit correctly', () => {
    const bitVector = new BitVector(100);
    const indices = [99, 88, 66, 65, 64, 63, 15, 14, 1, 0];
    const result = [];
    indices.forEach(index => bitVector.setBit(index));
    
    for (let i = bitVector.previousBit(100); i !== -1; i = bitVector.previousBit(i)) {
      result.push(i);
    }

    expect(result).toEqual(indices);
  });

  it('should return -1 when no previous bit is found', () => {
    const bitVector = new BitVector(16);

    expect(bitVector.previousBit(0)).toBe(-1);
  });

  it('should throw RangeError when previousBit is called with an unreachable value', () => {
    const bitVector = new BitVector(16);
    bitVector.setBit(5);

    expect(() => bitVector.previousBit(24)).toThrow(new RangeError('Unreachable value'));
  });
});