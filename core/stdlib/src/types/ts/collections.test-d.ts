import { describe, expectTypeOf, it } from 'vitest';
import type { Path, PathToPartialType, PathToType } from './collections';

describe('collections', () => {
  describe('Path', () => {
    it('parse simple object path', () => {
      type actual = Path<'user.name'>;
      type expected = ['user', 'name'];

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('parse simple array path', () => {
      type actual = Path<'user.0'>;
      type expected = ['user', '0'];

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('parse complex object path', () => {
      type actual = Path<'user.addresses.0.street'>;
      type expected = ['user', 'addresses', '0', 'street'];

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('parse double dot path', () => {
      type actual = Path<'user..name'>;
      type expected = ['user', '', 'name'];

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });
  });

  describe('PathToType', () => {
    it('convert simple object path', () => {
      type actual = PathToType<['user', 'name']>;
      interface expected { user: { name: unknown } }

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('convert simple array path', () => {
      type actual = PathToType<['user', '0']>;
      interface expected { user: unknown[] }

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('convert complex object path', () => {
      type actual = PathToType<['user', 'addresses', '0', 'street']>;
      interface expected { user: { addresses: Array<{ street: unknown }> } }

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('convert double dot path', () => {
      type actual = PathToType<['user', '', 'name']>;
      interface expected { user: { '': { name: unknown } } }

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('convert to custom target', () => {
      type actual = PathToType<['user', 'name'], string>;
      interface expected { user: { name: string } }

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });
  });

  describe('PathToPartialType', () => {
    type Shape = PathToPartialType<['user', 'name'], string>;

    it('accepts the full nested shape', () => {
      expectTypeOf<{ user: { name: 'John' } }>().toExtend<Shape>();
    });

    it('makes every key optional', () => {
      expectTypeOf<{ unrelated: number }>().toExtend<Shape>();
    });

    it('keeps objects open for extra keys', () => {
      expectTypeOf<{ user: { name: 'John'; age: number }; meta: boolean }>().toExtend<Shape>();
    });

    it('still enforces the leaf type when provided', () => {
      expectTypeOf<{ user: { name: number } }>().not.toExtend<Shape>();
    });

    it('resolves array segments to arrays', () => {
      type Indexed = PathToPartialType<['items', '0'], string>;

      expectTypeOf<{ items: string[] }>().toExtend<Indexed>();
    });
  });
});
