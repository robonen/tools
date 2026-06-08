import { describe, expect, it } from 'vitest';
import { keyBetween, keysBetween } from '..';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xFFFFFFFF;
  };
}

describe('keyBetween', () => {
  it('produces a key strictly between its bounds', () => {
    const a = keyBetween(null, null);
    const b = keyBetween(a, null);
    expect(b > a).toBe(true);
    const mid = keyBetween(a, b);
    expect(mid > a && mid < b).toBe(true);
  });

  it('rejects an inverted range', () => {
    expect(() => keyBetween('b', 'a')).toThrow();
  });

  it('keysBetween returns n ascending keys within the bounds', () => {
    const keys = keysBetween('a', 'b', 5);
    expect(keys).toHaveLength(5);
    for (let i = 1; i < keys.length; i++)
      expect(keys[i - 1]! < keys[i]!).toBe(true);
    expect(keys[0]! > 'a' && keys[keys.length - 1]! < 'b').toBe(true);
  });

  it('stays strictly ordered under 300 random insertions', () => {
    const rng = seeded(7);
    const keys: string[] = [keyBetween(null, null)];

    for (let i = 0; i < 300; i++) {
      const pos = Math.floor(rng() * (keys.length + 1));
      const lower = pos > 0 ? keys[pos - 1]! : null;
      const upper = pos < keys.length ? keys[pos]! : null;
      keys.splice(pos, 0, keyBetween(lower, upper));
    }

    for (let i = 1; i < keys.length; i++)
      expect(keys[i - 1]! < keys[i]!).toBe(true);
  });
});
