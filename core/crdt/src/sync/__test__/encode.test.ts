import { describe, expect, it } from 'vitest';
import { VersionVector, opId } from '../../clock';
import { decodeOps, decodeStateVector, encodeOps, encodeStateVector } from '..';

describe('sync encoding', () => {
  it('round-trips a version vector through bytes', () => {
    const vv = new VersionVector();
    vv.observe(opId('a', 3));
    vv.observe(opId('b', 1));

    const restored = decodeStateVector(encodeStateVector(vv));
    expect(restored.get('a')).toBe(3);
    expect(restored.get('b')).toBe(1);
  });

  it('round-trips an op batch through bytes', () => {
    const ops = [{ id: opId('a', 1), kind: 'insert', value: 'x' }];
    expect(decodeOps(encodeOps(ops))).toEqual(ops);
  });
});
