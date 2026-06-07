import { describe, expect, it } from 'vitest';
import { BitVector } from '.';

describe('BitVector', () => {
  it('initialize with the correct size', () => {
    const size = 16;
    const expectedSize = Math.ceil(size / 8);
    const bitVector = new BitVector(size);

    expect(bitVector.length).toBe(expectedSize);
  });

  it('set and get bits correctly', () => {
    const bitVector = new BitVector(16);
    bitVector.setBit(5);

    expect(bitVector.getBit(5)).toBe(true);
    expect(bitVector.getBit(4)).toBe(false);
  });

  it('get out of bounds bits correctly', () => {
    const bitVector = new BitVector(16);

    expect(bitVector.getBit(155)).toBe(false);
  });

  it('clear bits correctly', () => {
    const bitVector = new BitVector(16);
    bitVector.setBit(5);

    expect(bitVector.getBit(5)).toBe(true);

    bitVector.clearBit(5);

    expect(bitVector.getBit(5)).toBe(false);
  });

  it('find the previous bit correctly', () => {
    const bitVector = new BitVector(100);
    const indices = [99, 88, 66, 65, 64, 63, 15, 14, 1, 0];
    const result = [];
    indices.forEach(index => bitVector.setBit(index));

    for (let i = bitVector.previousBit(100); i !== -1; i = bitVector.previousBit(i)) {
      result.push(i);
    }

    expect(result).toEqual(indices);
  });

  it('return -1 when no previous bit is found', () => {
    const bitVector = new BitVector(16);

    expect(bitVector.previousBit(0)).toBe(-1);
  });

  it('clamp an out-of-range start index and return the previous set bit', () => {
    const bitVector = new BitVector(16);
    bitVector.setBit(5);

    expect(bitVector.previousBit(24)).toBe(5);
  });

  it('return -1 from previousBit on an empty out-of-range query', () => {
    const bitVector = new BitVector(16);

    expect(bitVector.previousBit(24)).toBe(-1);
  });

  it('toggle bits correctly', () => {
    const bitVector = new BitVector(16);

    bitVector.toggleBit(7);
    expect(bitVector.getBit(7)).toBe(true);

    bitVector.toggleBit(7);
    expect(bitVector.getBit(7)).toBe(false);
  });

  it('find the next bit correctly', () => {
    const bitVector = new BitVector(100);
    const indices = [0, 1, 14, 15, 63, 64, 65, 66, 88, 99];
    const result = [];
    indices.forEach(index => bitVector.setBit(index));

    for (let i = bitVector.nextBit(-1); i !== -1; i = bitVector.nextBit(i)) {
      result.push(i);
    }

    expect(result).toEqual(indices);
  });

  it('return -1 when no next bit is found', () => {
    const bitVector = new BitVector(16);

    expect(bitVector.nextBit(0)).toBe(-1);
    expect(bitVector.nextBit(15)).toBe(-1);
  });

  it('count the number of set bits', () => {
    const bitVector = new BitVector(100);

    expect(bitVector.count()).toBe(0);

    [0, 5, 63, 64, 99].forEach(index => bitVector.setBit(index));

    expect(bitVector.count()).toBe(5);

    bitVector.clearBit(5);

    expect(bitVector.count()).toBe(4);
  });

  it('tolerate out-of-bounds writes without crashing or corrupting in-range bits', () => {
    const bitVector = new BitVector(16);
    bitVector.setBit(3);

    expect(() => {
      bitVector.setBit(1000);
      bitVector.clearBit(1000);
      bitVector.toggleBit(1000);
    }).not.toThrow();

    // out-of-range reads are false; in-range state is intact
    expect(bitVector.getBit(1000)).toBe(false);
    expect(bitVector.getBit(3)).toBe(true);
    expect(bitVector.count()).toBe(1);
  });
});
