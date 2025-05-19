import { describe, it, expect } from 'vitest';
import { cluster } from '.';

describe('cluster', () => {
  it('cluster an array into subarrays of a specific size', () => {
    const result = cluster([1, 2, 3, 4, 5, 6, 7, 8], 3);

    expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7, 8]]);
  });

  it('handle arrays that are not perfectly divisible by the size', () => {
    const result = cluster([1, 2, 3, 4, 5], 2);

    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('return an array with each element in its own subarray if size is 1', () => {
    const result = cluster([1, 2, 3, 4], 1);

    expect(result).toEqual([[1], [2], [3], [4]]);
  });

  it('return an array with a single subarray if size is greater than the array length', () => {
    const result = cluster([1, 2, 3], 5);

    expect(result).toEqual([[1, 2, 3]]);
  });

  it('return an empty array if size is less than or equal to 0', () => {
    const result = cluster([1, 2, 3, 4], -1);

    expect(result).toEqual([]);
  });

  it('return an empty array if the input array is empty', () => {
    const result = cluster([], 3);
    
    expect(result).toEqual([]);
  });
});