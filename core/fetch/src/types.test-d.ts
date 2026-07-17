import { assertType, describe, expectTypeOf, it } from 'vitest';

import type { FetchOptions } from './types';
import { createFetch } from './fetch';

type Body = FetchOptions['body'];

describe('FetchOptions body', () => {
  it('accepts a named interface without a cast', () => {
    // The regression under test: a named `interface` has no implicit index
    // signature, so a `Record<string, unknown>` body type would reject it and
    // force a cast at every call site. It must assign directly.
    interface CreateUser { name: string; age: number }
    expectTypeOf<CreateUser>().toExtend<Body>();
    assertType<Body>({ name: 'Alice', age: 30 } satisfies CreateUser);
  });

  it('accepts plain objects, arrays, BodyInit strings and null', () => {
    assertType<Body>({ a: 1 });
    assertType<Body>([1, 2, 3]);
    assertType<Body>('raw string');
    assertType<Body>(new FormData());
    assertType<Body>(null);
  });

  it('rejects bare primitives', () => {
    // @ts-expect-error a bare number is not a valid request body
    assertType<Body>(42);
    // @ts-expect-error a bare boolean is not a valid request body
    assertType<Body>(true);
  });

  it('lets a typed interface flow through the method shortcuts', () => {
    interface CreateDeal { title: string; amount: number }
    const $fetch = createFetch();
    const deal: CreateDeal = { title: 'x', amount: 1 };
    // Must type-check with no cast on the body.
    expectTypeOf($fetch.post).toBeCallableWith('/deals', { body: deal });
  });
});
