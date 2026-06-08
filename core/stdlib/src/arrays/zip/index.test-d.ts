import { describe, expectTypeOf, it } from 'vitest';
import { zip } from '.';

describe('zip', () => {
  it('produces tuples of the element types (two arrays)', () => {
    const result = zip([1, 2], ['a', 'b']);

    expectTypeOf(result).toEqualTypeOf<Array<[number, string]>>();
  });

  it('produces tuples of the element types (three arrays)', () => {
    const result = zip([1], ['a'], [true]);

    expectTypeOf(result).toEqualTypeOf<Array<[number, string, boolean]>>();
  });

  it('zips a single array into singleton tuples', () => {
    const result = zip([1, 2, 3]);

    expectTypeOf(result).toEqualTypeOf<Array<[number]>>();
  });

  it('produces tuples for four and five arrays', () => {
    expectTypeOf(zip([1], ['a'], [true], [9])).toEqualTypeOf<Array<[number, string, boolean, number]>>();
    expectTypeOf(zip([1], ['a'], [true], [9], ['x'])).toEqualTypeOf<Array<[number, string, boolean, number, string]>>();
  });
});
