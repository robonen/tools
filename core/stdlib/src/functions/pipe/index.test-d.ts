import { describe, expectTypeOf, it } from 'vitest';
import { pipe } from '.';

describe('pipe', () => {
  it('infers the final return type through the chain', () => {
    const fn = pipe((n: number) => n + 1, n => `${n}`, s => s.length > 0);

    expectTypeOf(fn).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(fn).returns.toEqualTypeOf<boolean>();
  });

  it('keeps the variadic parameters of the first function', () => {
    const fn = pipe((a: number, b: number) => a + b, n => `${n}`);

    expectTypeOf(fn).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(fn).returns.toEqualTypeOf<string>();
  });

  it('supports a single function', () => {
    const fn = pipe((n: number) => n > 0);

    expectTypeOf(fn).returns.toEqualTypeOf<boolean>();
  });
});
