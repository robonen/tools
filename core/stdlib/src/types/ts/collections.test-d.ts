import { describe, expectTypeOf, it } from 'vitest';
import type { Path, PathToType } from './collections';

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
      type expected = { user: { name: unknown } };

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('convert simple array path', () => {
      type actual = PathToType<['user', '0']>;
      type expected = { user: unknown[] };

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('convert complex object path', () => {
      type actual = PathToType<['user', 'addresses', '0', 'street']>;
      type expected = { user: { addresses: { street: unknown }[] } };

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('convert double dot path', () => {
      type actual = PathToType<['user', '', 'name']>;
      type expected = { user: { '': { name: unknown } } };

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('convert to custom target', () => {
      type actual = PathToType<['user', 'name'], string>;
      type expected = { user: { name: string } };

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });
  });
});