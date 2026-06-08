import { describe, expect, it } from 'vitest';
import { set } from '.';

describe('set', () => {
  it('set a top-level property', () => {
    expect(set({ name: 'John' }, 'name', 'Jane')).toEqual({ name: 'Jane' });
  });

  it('set a nested object property', () => {
    expect(set({ user: { name: 'John' } }, 'user.name', 'Jane')).toEqual({ user: { name: 'Jane' } });
  });

  it('set through an array index', () => {
    expect(set({ items: [{ id: 1 }, { id: 2 }] }, 'items.1.id', 9)).toEqual({ items: [{ id: 1 }, { id: 9 }] });
  });

  it('create missing object intermediates', () => {
    expect(set({}, 'a.b.c', 42)).toEqual({ a: { b: { c: 42 } } });
  });

  it('create an array when the next segment is numeric', () => {
    const result = set({} as Record<string, unknown>, 'items.0.id', 1);
    expect(Array.isArray((result as any).items)).toBe(true);
    expect(result).toEqual({ items: [{ id: 1 }] });
  });

  it('overwrite a non-object intermediate', () => {
    expect(set({ a: 1 } as Record<string, unknown>, 'a.b', 2)).toEqual({ a: { b: 2 } });
  });

  it('mutate and return the same reference', () => {
    const source = { a: 1 };
    expect(set(source, 'a', 2)).toBe(source);
    expect(source.a).toBe(2);
  });

  it('preserve falsy values', () => {
    expect(set({}, 'count', 0)).toEqual({ count: 0 });
    expect(set({}, 'flag', false)).toEqual({ flag: false });
  });

  it('return the object unchanged for an empty path', () => {
    const source = { a: 1 };
    expect(set(source, '', 2)).toBe(source);
    expect(source).toEqual({ a: 1 });
  });
});
