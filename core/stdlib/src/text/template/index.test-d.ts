import { describe, expectTypeOf, it } from 'vitest';
import type { ClearPlaceholder, ExtractPlaceholders, GenerateTypes } from './index';
import { templateObject } from './index';

describe('template', () => {
  describe('ClearPlaceholder', () => {
    it('ignores strings without braces', () => {
      type actual = ClearPlaceholder<'name'>;
      type expected = 'name';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('removes all balanced braces from placeholders', () => {
      type actual1 = ClearPlaceholder<'{name}'>;
      type actual2 = ClearPlaceholder<'{{name}}'>;
      type actual3 = ClearPlaceholder<'{{{name}}}'>;
      type expected = 'name';

      expectTypeOf<actual1>().toEqualTypeOf<expected>();
      expectTypeOf<actual2>().toEqualTypeOf<expected>();
      expectTypeOf<actual3>().toEqualTypeOf<expected>();
    });

    it('removes all unbalanced braces from placeholders', () => {
      type actual1 = ClearPlaceholder<'{name}}'>;
      type actual2 = ClearPlaceholder<'{{name}}}'>;
      type expected = 'name';

      expectTypeOf<actual1>().toEqualTypeOf<expected>();
      expectTypeOf<actual2>().toEqualTypeOf<expected>();
    });
  });

  describe('ExtractPlaceholders', () => {
    it('string without placeholders', () => {
      type actual = ExtractPlaceholders<'Hello name, how are?'>;
      type expected = never;

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('string with one idexed placeholder', () => {
      type actual = ExtractPlaceholders<'Hello {0}, how are you?'>;
      type expected = '0';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('string with two indexed placeholders', () => {
      type actual = ExtractPlaceholders<'Hello {0}, my name is {1}'>;
      type expected = '0' | '1';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('string with one key placeholder', () => {
      type actual = ExtractPlaceholders<'Hello {name}, how are you?'>;
      type expected = 'name';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('string with two key placeholders', () => {
      type actual = ExtractPlaceholders<'Hello {name}, my name is {managers.0.name}'>;
      type expected = 'name' | 'managers.0.name';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('string with mixed placeholders', () => {
      type actual = ExtractPlaceholders<'Hello {0}, how are you? My name is {1.name}'>;
      type expected = '0' | '1.name';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('string with nested placeholder and balanced braces', () => {
      type actual = ExtractPlaceholders<'Hello {{name}}, how are you?'>;
      type expected = 'name';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('string with nested placeholder and unbalanced braces', () => {
      type actual = ExtractPlaceholders<'Hello {{{name}, how are you?'>;
      type expected = 'name';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('string with nested placeholders and balanced braces', () => {
      type actual = ExtractPlaceholders<'Hello {{{name}{positions}}}, how are you?'>;
      type expected = 'name' | 'positions';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('string with nested placeholders and unbalanced braces', () => {
      type actual = ExtractPlaceholders<'Hello {{{name}{positions}, how are you?'>;
      type expected = 'name' | 'positions';

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });
  });

  describe('GenerateTypes', () => {
    type Shape = GenerateTypes<'user.name', string>;

    it('accepts a fully-matching shape', () => {
      expectTypeOf<{ user: { name: 'John' } }>().toExtend<Shape>();
    });

    it('accepts missing keys (every key is optional)', () => {
      expectTypeOf<{ unrelated: number }>().toExtend<Shape>();
    });

    it('accepts extra keys (objects stay open)', () => {
      expectTypeOf<{ user: { name: 'John' }; extra: number }>().toExtend<Shape>();
    });

    it('rejects a mistyped leaf value', () => {
      expectTypeOf<{ user: { name: number } }>().not.toExtend<Shape>();
    });
  });

  describe('templateObject', () => {
    it('always returns a string', () => {
      expectTypeOf(templateObject('Hello, {name}!', { name: 'John' })).toEqualTypeOf<string>();
      expectTypeOf(templateObject('Hi {user.name}', { user: { name: 'John' } })).toEqualTypeOf<string>();
    });

    it('accepts a string or factory fallback', () => {
      expectTypeOf(templateObject('Hello, {name}!', {}, 'Guest')).toEqualTypeOf<string>();
      expectTypeOf(templateObject('Hello, {name}!', {}, key => `<${key}>`)).toEqualTypeOf<string>();
    });
  });
});
