import { describe, expect, it } from 'vitest';
import { insert } from '.';

describe('insert', () => {
  it('insert a single item', () => {
    expect(insert(['a', 'c'], 1, 'b')).toEqual(['a', 'b', 'c']);
  });

  it('insert multiple items', () => {
    expect(insert(['a', 'd'], 1, 'b', 'c')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('prepend at index 0', () => {
    expect(insert(['b', 'c'], 0, 'a')).toEqual(['a', 'b', 'c']);
  });

  it('append when the index is too large', () => {
    expect(insert(['a'], 99, 'b', 'c')).toEqual(['a', 'b', 'c']);
  });

  it('clamp a negative index to 0', () => {
    expect(insert(['b'], -5, 'a')).toEqual(['a', 'b']);
  });

  it('never mutate the source', () => {
    const source = ['a', 'b'];
    insert(source, 1, 'x');
    expect(source).toEqual(['a', 'b']);
  });
});
