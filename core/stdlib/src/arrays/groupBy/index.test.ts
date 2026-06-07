import { describe, expect, it } from 'vitest';
import { groupBy } from '.';

describe('groupBy', () => {
  it('group by a string key', () => {
    const result = groupBy([1, 2, 3, 4], n => (n % 2 === 0 ? 'even' : 'odd'));

    expect(result).toEqual({ odd: [1, 3], even: [2, 4] });
  });

  it('group objects by a property', () => {
    const input = [
      { type: 'a', v: 1 },
      { type: 'b', v: 2 },
      { type: 'a', v: 3 },
    ];

    expect(groupBy(input, item => item.type)).toEqual({
      a: [{ type: 'a', v: 1 }, { type: 'a', v: 3 }],
      b: [{ type: 'b', v: 2 }],
    });
  });

  it('pass the index to the key function', () => {
    const result = groupBy(['a', 'b', 'c', 'd'], (_, i) => i % 2);

    expect(result).toEqual({ 0: ['a', 'c'], 1: ['b', 'd'] });
  });

  it('return an empty object for an empty array', () => {
    expect(groupBy([], () => 'x')).toEqual({});
  });

  it('push elements by reference (no cloning)', () => {
    const item = { id: 1 };
    const result = groupBy([item], x => x.id);

    expect(result[1]![0]).toBe(item);
  });

  it('handle __proto__ and other Object.prototype keys as ordinary groups', () => {
    const proto = groupBy(['a', 'b'], (): string => '__proto__');
    expect(proto.__proto__).toEqual(['a', 'b']);

    const ctor = groupBy(['x'], (): string => 'constructor');
    expect(ctor.constructor).toEqual(['x']);
  });
});
