import { describe, expectTypeOf, it } from 'vitest';
import type { HasSpaces, Trim, Stringable } from './string';

describe('string', () => {
    describe('Stringable', () => {
      it('should be a string', () => {
        expectTypeOf(Number(1)).toExtend<Stringable>();
        expectTypeOf(String(1)).toExtend<Stringable>();
        expectTypeOf(Symbol()).toExtend<Stringable>();
        expectTypeOf(new Array(1)).toExtend<Stringable>();
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
    });
});