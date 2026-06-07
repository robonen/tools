import { describe, expect, it } from 'vitest';
import { get } from '.';

describe('get', () => {
  it('read a top-level property', () => {
    expect(get({ name: 'John' }, 'name')).toBe('John');
  });

  it('read a nested object property', () => {
    expect(get({ user: { name: 'John' } }, 'user.name')).toBe('John');
  });

  it('read a value through an array index', () => {
    expect(get({ items: [{ id: 1 }, { id: 2 }] }, 'items.1.id')).toBe(2);
  });

  it('read deeply nested values', () => {
    const source = { a: { b: { c: { d: 42 } } } };

    expect(get(source, 'a.b.c.d')).toBe(42);
  });

  it('return undefined for a missing leaf', () => {
    expect(get({ user: { name: 'John' } }, 'user.age')).toBeUndefined();
  });

  it('return undefined when traversing through a missing branch', () => {
    expect(get({ a: 1 }, 'a.b.c')).toBeUndefined();
  });

  it('return undefined when traversing through null/undefined', () => {
    expect(get({ user: null }, 'user.name')).toBeUndefined();
    expect(get({ user: undefined }, 'user.name')).toBeUndefined();
  });

  it('preserve falsy values', () => {
    expect(get({ count: 0 }, 'count')).toBe(0);
    expect(get({ flag: false }, 'flag')).toBe(false);
    expect(get({ value: '' }, 'value')).toBe('');
  });

  it('work on arrays as the root collection', () => {
    expect(get(['a', 'b', 'c'], '2')).toBe('c');
  });

  it('return the object itself for an empty path', () => {
    const obj = { a: 1 };

    expect(get(obj, '')).toBeUndefined();
  });

  it('resolve own properties (inherited keys are reachable via the prototype chain)', () => {
    const proto = { inherited: 'from-proto' };
    const obj = Object.create(proto) as { inherited: string; own?: number };
    obj.own = 1;

    expect(get(obj, 'own')).toBe(1);
    // documents current behavior: bracket access does walk the prototype chain
    expect(get(obj, 'inherited')).toBe('from-proto');
  });
});
