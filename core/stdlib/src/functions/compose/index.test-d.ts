import { describe, expectTypeOf, it } from 'vitest';
import { compose } from '.';

describe('compose', () => {
  it('infers the final return type through the chain', () => {
    const fn = compose((s: string) => s.length > 0, (n: number) => `${n}`, (n: number) => n + 1);

    expectTypeOf(fn).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(fn).returns.toEqualTypeOf<boolean>();
  });

  it('keeps the variadic parameters of the last function', () => {
    const fn = compose((n: number) => `${n}`, (a: number, b: number) => a + b);

    expectTypeOf(fn).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(fn).returns.toEqualTypeOf<string>();
  });
});
