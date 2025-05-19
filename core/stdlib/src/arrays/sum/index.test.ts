import { describe, it, expect } from 'vitest';
import { sum } from '.';

describe('sum', () => {
  it('return the sum of all elements in a number array', () => {
    const result = sum([1, 2, 3, 4, 5]);

    expect(result).toBe(15);
  });

  it('return 0 for an empty array', () => {
    const result = sum([]);

    expect(result).toBe(0);
  });

  it('return the sum of all elements using a getValue function', () => {
    const result = sum([{ value: 1 }, { value: 2 }, { value: 3 }], (item) => item.value);

    expect(result).toBe(6);
  });

  it('handle arrays with negative numbers', () => {
    const result = sum([-1, -2, -3, -4, -5]);

    expect(result).toBe(-15);
  });

  it('handle arrays with mixed positive and negative numbers', () => {
    const result = sum([1, -2, 3, -4, 5]);

    expect(result).toBe(3);
  });

  it('handle arrays with floating point numbers', () => {
    const result = sum([1.5, 2.5, 3.5]);

    expect(result).toBe(7.5);
  });

  it('handle arrays with a getValue function returning floating point numbers', () => {
    const result = sum([{ value: 1.5 }, { value: 2.5 }, { value: 3.5 }], (item) => item.value);
    
    expect(result).toBe(7.5);
  });
});