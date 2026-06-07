import { describe, expect, it } from 'vitest';
import { LamportClock, VersionVector, compareOpId, opId, opIdEq } from '..';

describe('compareOpId', () => {
  it('orders by clock, then by site id', () => {
    expect(compareOpId(opId('a', 1), opId('a', 2))).toBeLessThan(0);
    expect(compareOpId(opId('a', 2), opId('b', 2))).toBeLessThan(0);
    expect(compareOpId(opId('b', 2), opId('a', 2))).toBeGreaterThan(0);
    expect(compareOpId(opId('a', 2), opId('a', 2))).toBe(0);
    expect(opIdEq(opId('a', 1), opId('a', 1))).toBe(true);
  });
});

describe('lamportClock', () => {
  it('ticks monotonically and advances past observed remote ops', () => {
    const clock = new LamportClock('a');
    expect(clock.tick()).toEqual({ site: 'a', clock: 1 });
    expect(clock.tick()).toEqual({ site: 'a', clock: 2 });
    clock.observe({ site: 'b', clock: 5 });
    expect(clock.tick().clock).toBe(6);
  });
});

describe('versionVector', () => {
  it('tracks seen ops and round-trips through JSON', () => {
    const vv = new VersionVector();
    vv.observe(opId('a', 3));
    vv.observe(opId('b', 1));

    expect(vv.has(opId('a', 2))).toBe(true);
    expect(vv.has(opId('a', 3))).toBe(true);
    expect(vv.has(opId('a', 4))).toBe(false);
    expect(vv.has(opId('c', 1))).toBe(false);

    const restored = VersionVector.fromJSON(vv.toJSON());
    expect(restored.get('a')).toBe(3);
    expect(restored.get('b')).toBe(1);
  });
});
