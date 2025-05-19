import { describe, it, expect } from 'vitest';
import { pick } from '.';

describe('pick', () => {
  it('pick a single key', () => {
    const result = pick({ a: 1, b: 2, c: 3 }, 'a');

    expect(result).toEqual({ a: 1 });
  });

  it('pick multiple keys', () => {
    const result = pick({ a: 1, b: 2, c: 3 }, ['a', 'b']);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('return an empty object when no keys are provided', () => {
    const result = pick({ a: 1, b: 2 }, []);

    expect(result).toEqual({});
  });

  it('handle non-existent keys by setting them to undefined', () => {
    const result = pick({ a: 1, b: 2 }, ['a', 'c'] as any);

    expect(result).toEqual({ a: 1, c: undefined });
  });

  it('return an empty object if target is null or undefined', () => {
    const emptyTarget = pick(null as any, 'a');
    const emptyKeys = pick({ a: 1 }, null as any);

    expect(emptyTarget).toEqual({});
    expect(emptyKeys).toEqual({});
  });
});