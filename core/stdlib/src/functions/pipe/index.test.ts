import { describe, expect, it } from 'vitest';
import { pipe } from '.';

describe('pipe', () => {
  it('apply functions left-to-right', () => {
    const calc = pipe((n: number) => n + 1, n => n * 2, n => `= ${n}`);

    expect(calc(3)).toBe('= 8');
  });

  it('pass multiple arguments to the first function', () => {
    const calc = pipe((a: number, b: number) => a + b, n => n * 10);

    expect(calc(2, 3)).toBe(50);
  });

  it('support a single function', () => {
    const inc = pipe((n: number) => n + 1);

    expect(inc(1)).toBe(2);
  });

  it('preserve this for the first function', () => {
    const calc = pipe(function (this: { base: number }, n: number) {
      return this.base + n;
    }, n => n * 2);

    expect(calc.call({ base: 10 }, 5)).toBe(30);
  });

  it('return the input unchanged with no functions', () => {
    expect((pipe as unknown as (...fns: never[]) => (x: number) => number)()(42)).toBe(42);
  });
});
