import { describe, expectTypeOf, it } from 'vitest';
import { get } from '.';
import type { Get } from '.';

describe('get', () => {
  describe('runtime return type', () => {
    it('infer a nested object value', () => {
      expectTypeOf(get({ user: { name: 'John' } }, 'user.name')).toEqualTypeOf<string | undefined>();
    });

    it('infer a value behind an array index', () => {
      expectTypeOf(get({ items: [{ id: 1 }] }, 'items.0.id')).toEqualTypeOf<number | undefined>();
    });

    it('infer an array element', () => {
      expectTypeOf(get({ items: [{ id: 1 }] }, 'items.0')).toEqualTypeOf<{ id: number } | undefined>();
    });

    it('infer the element type of a root array', () => {
      expectTypeOf(get(['a', 'b', 'c'], '0')).toEqualTypeOf<string | undefined>();
    });

    it('narrow to undefined when descending into a primitive', () => {
      expectTypeOf(get({ a: 1 }, 'a.b.c')).toEqualTypeOf<undefined>();
    });

    it('narrow to undefined for a missing key', () => {
      expectTypeOf(get({ user: { name: 'John' } }, 'user.age')).toEqualTypeOf<undefined>();
    });
  });

  describe('Get', () => {
    it('resolve a simple object path', () => {
      expectTypeOf<Get<{ user: { name: string } }, 'user.name'>>().toEqualTypeOf<string>();
    });

    it('resolve a path through an array index (general arrays widen with undefined)', () => {
      expectTypeOf<Get<{ list: number[] }, 'list.0'>>().toEqualTypeOf<number | undefined>();
    });

    it('resolve an exact element type from a tuple', () => {
      expectTypeOf<Get<{ pair: [string, number] }, 'pair.1'>>().toEqualTypeOf<number>();
    });

    it('resolve a deeply nested path', () => {
      expectTypeOf<Get<{ a: { b: { c: boolean } } }, 'a.b.c'>>().toEqualTypeOf<boolean>();
    });

    it('resolve to never for a missing key', () => {
      expectTypeOf<Get<{ a: number }, 'b'>>().toEqualTypeOf<never>();
    });
  });
});
