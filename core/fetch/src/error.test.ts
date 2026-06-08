import { FetchError, createFetchError } from './error';
import { describe, expect, it } from 'vitest';
import type { FetchContext } from './types';

function makeContext(overrides: Partial<FetchContext> = {}): FetchContext {
  return {
    request: 'https://example.com/api',
    options: { headers: new Headers() },
    response: undefined,
    error: undefined,
    ...overrides,
  } as FetchContext;
}

describe('FetchError', () => {
  it('is an instance of Error', () => {
    const err = new FetchError('oops');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FetchError);
  });

  it('has name "FetchError"', () => {
    expect(new FetchError('x').name).toBe('FetchError');
  });

  it('preserves the message', () => {
    expect(new FetchError('something went wrong').message).toBe('something went wrong');
  });
});

describe('createFetchError', () => {
  it('includes the request URL in the message', () => {
    const err = createFetchError(makeContext());
    expect(err.message).toContain('https://example.com/api');
  });

  it('appends status information when a response is present', () => {
    const response = new Response('', { status: 404, statusText: 'Not Found' });
    const err = createFetchError(makeContext({ response: response as never }));
    expect(err.message).toContain('404');
    expect(err.message).toContain('Not Found');
    expect(err.status).toBe(404);
    expect(err.statusCode).toBe(404);
    expect(err.statusText).toBe('Not Found');
    expect(err.statusMessage).toBe('Not Found');
  });

  it('appends the underlying error message when present', () => {
    const networkErr = new Error('Failed to fetch');
    const err = createFetchError(makeContext({ error: networkErr }));
    expect(err.message).toContain('Failed to fetch');
  });

  it('populates response._data as data', () => {
    const response = Object.assign(new Response('', { status: 422 }), { _data: { code: 42 } });
    const err = createFetchError(makeContext({ response: response as never }));
    expect(err.data).toEqual({ code: 42 });
  });

  it('works with a URL object as request', () => {
    const ctx = makeContext({ request: new URL('https://example.com/test') });
    const err = createFetchError(ctx);
    expect(err.message).toContain('https://example.com/test');
  });

  it('works with a Request object as request', () => {
    const ctx = makeContext({ request: new Request('https://example.com/req') });
    const err = createFetchError(ctx);
    expect(err.message).toContain('https://example.com/req');
  });
});
