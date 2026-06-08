import { describe, expectTypeOf, it } from 'vitest';
import { tryIt } from '.';

describe('tryIt', () => {
  it('wraps async returns in a Promise of the discriminated union', () => {
    const wrapped = tryIt(async (n: number) => n * 2);

    expectTypeOf(wrapped(2)).toEqualTypeOf<
      Promise<{ error: Error; data: undefined } | { error: undefined; data: number }>
    >();
  });

  it('keeps sync returns synchronous', () => {
    const wrapped = tryIt((n: number) => n * 2);

    expectTypeOf(wrapped(2)).toEqualTypeOf<
      { error: Error; data: undefined } | { error: undefined; data: number }
    >();
  });

  it('unwraps Awaited for a promise-returning function', () => {
    const wrapped = tryIt((n: number) => Promise.resolve(`${n}`));

    expectTypeOf(wrapped(1)).toEqualTypeOf<
      Promise<{ error: Error; data: undefined } | { error: undefined; data: string }>
    >();
  });

  it('narrows data when error is checked', () => {
    const result = tryIt((n: number) => n)(1);

    if (result.error === undefined)
      expectTypeOf(result.data).toEqualTypeOf<number>();
    else
      expectTypeOf(result.data).toEqualTypeOf<undefined>();
  });
});
