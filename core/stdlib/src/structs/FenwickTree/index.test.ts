import { describe, expect, it } from 'vitest';

import { FenwickTree } from '.';

/** Deterministic LCG so failures reproduce. */
function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

describe('FenwickTree', () => {
  it('should match naive sums after build', () => {
    const rand = lcg(1);
    const values = Array.from({ length: 137 }, () => Math.floor(rand() * 100));
    const tree = new FenwickTree(values.length);
    tree.build(values);

    let sum = 0;
    for (let i = 0; i <= values.length; i++) {
      expect(tree.prefix(i)).toBe(sum);
      if (i < values.length)
        sum += values[i]!;
    }
  });

  it('should keep prefix sums consistent with a naive array under updates', () => {
    const rand = lcg(2);
    const length = 64;
    const naive = Array.from({ length }, () => Math.floor(rand() * 50));
    const tree = new FenwickTree(length);
    tree.build(naive);

    for (let op = 0; op < 500; op++) {
      const index = Math.floor(rand() * length);
      const delta = Math.floor(rand() * 40) - 20;
      naive[index]! += delta;
      tree.update(index, delta);

      const probe = Math.floor(rand() * (length + 1));
      const expected = naive.slice(0, probe).reduce((a, b) => a + b, 0);
      expect(tree.prefix(probe)).toBe(expected);
    }
  });

  it('should match a linear scan in lowerBound, including stride and zero values', () => {
    const rand = lcg(3);
    for (let round = 0; round < 20; round++) {
      const length = 1 + Math.floor(rand() * 40);
      const values = Array.from({ length }, () => rand() < 0.2 ? 0 : Math.floor(rand() * 60));
      const stride = round % 3 === 0 ? 0 : Math.floor(rand() * 10);
      const tree = new FenwickTree(length);
      tree.build(values);

      const total = values.reduce((a, b) => a + b, 0) + length * stride;
      for (const target of [-5, 0, 1, total / 3, total / 2, total - 1, total, total + 100]) {
        let expected = 0;
        for (let c = 0; c <= length; c++) {
          const g = values.slice(0, c).reduce((a, b) => a + b, 0) + c * stride;
          if (g <= target)
            expected = c;
          else
            break;
        }
        if (target < 0)
          expected = 0;
        expect(tree.lowerBound(target, stride), `length=${length} stride=${stride} target=${target}`).toBe(expected);
      }
    }
  });

  it('should handle an empty tree', () => {
    const tree = new FenwickTree(0);

    expect(tree.prefix(0)).toBe(0);
    expect(tree.lowerBound(0)).toBe(0);
    expect(tree.lowerBound(100)).toBe(0);
  });

  it('should rebuild in place via build', () => {
    const tree = new FenwickTree(4);
    tree.build([1, 2, 3, 4]);
    expect(tree.prefix(4)).toBe(10);

    tree.build([10, 10, 10, 10]);
    expect(tree.prefix(2)).toBe(20);
    expect(tree.prefix(4)).toBe(40);
  });
});
