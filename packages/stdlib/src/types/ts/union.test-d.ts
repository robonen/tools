import { describe, expectTypeOf, it } from 'vitest';
import type { UnionToIntersection } from './union';

describe('union', () => {
  describe('UnionToIntersection', () => {
    it('convert a union type to an intersection type', () => {
      type actual = UnionToIntersection<{ a: string } | { b: number }>;
      type expected = { a: string } & { b: number };

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('convert a union type to an intersection type with more than two types', () => {
      type actual = UnionToIntersection<{ a: string } | { b: number } | { c: boolean }>;
      type expected = { a: string } & { b: number } & { c: boolean };

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('no change when the input is already an intersection type', () => {
      type actual = UnionToIntersection<{ a: string } & { b: number }>;
      type expected = { a: string } & { b: number };

      expectTypeOf<actual>().toEqualTypeOf<expected>();
    });

    it('never when union not possible', () => {
      expectTypeOf<UnionToIntersection<string | number>>().toEqualTypeOf<never>();
    });
  });
});