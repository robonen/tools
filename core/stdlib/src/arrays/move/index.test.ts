import { describe, expect, it } from 'vitest';
import { move } from '.';

describe('move', () => {
  it('move an item forward', () => {
    expect(move(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('move an item backward', () => {
    expect(move(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('clamp the target index', () => {
    expect(move(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
  });

  it('return a copy unchanged for an out-of-range source', () => {
    const source = ['a', 'b'];
    const result = move(source, 5, 0);
    expect(result).toEqual(['a', 'b']);
    expect(result).not.toBe(source);
  });

  it('never mutate the source', () => {
    const source = ['a', 'b', 'c'];
    move(source, 0, 2);
    expect(source).toEqual(['a', 'b', 'c']);
  });
});
