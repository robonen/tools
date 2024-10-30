import { describe, it, expect } from 'vitest';
import { omit } from '.';

describe('omit', () => {
  it('omit a single key from the object', () => {
    const result = omit({ a: 1, b: 2, c: 3 }, 'a');

    expect(result).toEqual({ b: 2, c: 3 });
  });

  it('omit multiple keys from the object', () => {
    const result = omit({ a: 1, b: 2, c: 3 }, ['a', 'b']);

    expect(result).toEqual({ c: 3 });
  });

  it('return the same object if no keys are omitted', () => {
    const result = omit({ a: 1, b: 2, c: 3 }, []);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('not modify the original object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = omit(obj, 'a');

    expect(obj).toEqual({ a: 1, b: 2, c: 3 });
    expect(result).toEqual({ b: 2, c: 3 });
  });

  it('handle an empty object', () => {
    const result = omit({}, 'a' as any);

    expect(result).toEqual({});
  });

  it('handle non-existent keys gracefully', () => {
    const result = omit({ a: 1, b: 2, c: 3 } as Record<string, number>, 'd');

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('handle null gracefully', () => {
    const emptyTarget = omit(null as any, 'a');
    const emptyKeys = omit({ a: 1 }, null as any);

    expect(emptyTarget).toEqual({});
    expect(emptyKeys).toEqual({ a: 1 });
  });
});