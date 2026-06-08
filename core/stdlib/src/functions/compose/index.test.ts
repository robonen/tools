import { describe, expect, it } from 'vitest';
import { compose } from '.';

describe('compose', () => {
  it('apply functions right-to-left', () => {
    const calc = compose((n: number) => `= ${n}`, (n: number) => n * 2, (n: number) => n + 1);

    expect(calc(3)).toBe('= 8');
  });

  it('pass multiple arguments to the last function', () => {
    const calc = compose((n: number) => n * 10, (a: number, b: number) => a + b);

    expect(calc(2, 3)).toBe(50);
  });

  it('support a single function', () => {
    const inc = compose((n: number) => n + 1);

    expect(inc(1)).toBe(2);
  });

  it('mirror pipe with reversed arguments', () => {
    const f = (n: number) => n + 1;
    const g = (n: number) => n * 2;

    expect(compose(g, f)(3)).toBe(8);
  });

  it('forward this to the right-most function', () => {
    const calc = compose((n: number) => n * 2, function (this: { base: number }, n: number) {
      return this.base + n;
    });

    expect(calc.call({ base: 10 }, 5)).toBe(30);
  });

  it('return the input unchanged with no functions', () => {
    expect((compose as unknown as (...fns: never[]) => (x: number) => number)()(42)).toBe(42);
  });
});
