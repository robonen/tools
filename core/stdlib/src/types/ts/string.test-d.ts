import { describe, expectTypeOf, it } from 'vitest';
import type { HasSpaces, Stringable, Trim } from './string';

describe('string', () => {
  describe('Stringable', () => {
    it('should be a string', () => {
      expectTypeOf(Number(1)).toExtend<Stringable>();
      expectTypeOf(String(1)).toExtend<Stringable>();
      expectTypeOf(Symbol('test')).toExtend<Stringable>();
      expectTypeOf([1]).toExtend<Stringable>();
      expectTypeOf(new Object()).toExtend<Stringable>();
      expectTypeOf(new Date()).toExtend<Stringable>();
    });
  });

  describe('Trim', () => {
    it('remove leading and trailing spaces from a string', () => {
      type actual = Trim<'  hello  '>;
      type expected = 'hello';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('remove only leading spaces from a string', () => {
      type actual = Trim<'  hello'>;
      type expected = 'hello';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('remove only trailing spaces from a string', () => {
      type actual = Trim<'hello  '>;
      type expected = 'hello';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('trim tabs, newlines and carriage returns', () => {
      expectTypeOf<Trim<'\thello\n'>>().toEqualTypeOf<'hello'>();
      expectTypeOf<Trim<'\r\n hello \r\n'>>().toEqualTypeOf<'hello'>();
    });

    it('handle empty and whitespace-only strings', () => {
      expectTypeOf<Trim<''>>().toEqualTypeOf<''>();
      expectTypeOf<Trim<'   '>>().toEqualTypeOf<''>();
    });

    it('preserve interior spaces', () => {
      expectTypeOf<Trim<'  a b  '>>().toEqualTypeOf<'a b'>();
    });
  });

  describe('HasSpaces', () => {
    it('check if a string has spaces', () => {
      type actual = HasSpaces<'hello world'>;
      type expected = true;

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('check if a string has no spaces', () => {
      type actual = HasSpaces<'helloworld'>;
      type expected = false;

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('false for an empty string', () => {
      expectTypeOf<HasSpaces<''>>().toEqualTypeOf<false>();
    });

    it('true for leading or trailing spaces', () => {
      expectTypeOf<HasSpaces<' a'>>().toEqualTypeOf<true>();
      expectTypeOf<HasSpaces<'a '>>().toEqualTypeOf<true>();
    });
  });
});
