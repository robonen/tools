import { describe, expect, it } from 'vitest';
import { opId } from '../../clock';
import { LwwMap, LwwRegister } from '..';

describe('lwwRegister', () => {
  it('keeps the write with the higher op id regardless of order', () => {
    const a = new LwwRegister('init');
    a.set('first', opId('a', 1));
    a.set('second', opId('b', 2));
    expect(a.get()).toBe('second');

    // A later-arriving but older write must not win.
    expect(a.set('stale', opId('a', 1))).toBe(false);
    expect(a.get()).toBe('second');
  });

  it('converges when concurrent writes arrive in opposite orders', () => {
    const left = new LwwRegister('x');
    const right = new LwwRegister('x');
    left.set('A', opId('a', 5));
    left.set('B', opId('b', 5));
    right.set('B', opId('b', 5));
    right.set('A', opId('a', 5));
    expect(left.get()).toBe(right.get());
    expect(left.get()).toBe('B'); // site 'b' > 'a' at equal clock
  });
});

describe('lwwMap', () => {
  it('handles set/delete with tombstones', () => {
    const map = new LwwMap<string, number>();
    map.set('k', 1, opId('a', 1));
    expect(map.get('k')).toBe(1);
    map.delete('k', opId('a', 2));
    expect(map.has('k')).toBe(false);
    // A concurrent older set loses to the delete.
    expect(map.set('k', 9, opId('a', 1))).toBe(false);
    expect(map.has('k')).toBe(false);
  });
});
