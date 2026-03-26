import {
  buildURL,
  callHooks,
  detectResponseType,
  isJSONSerializable,
  isPayloadMethod,
  joinURL,
  resolveFetchOptions,
} from './utils';
import { describe, expect, it } from 'vitest';
import type { FetchContext } from './types';

// ---------------------------------------------------------------------------
// isPayloadMethod
// ---------------------------------------------------------------------------

describe('isPayloadMethod', () => {
  it('returns true for payload methods', () => {
    expect(isPayloadMethod('POST')).toBe(true);
    expect(isPayloadMethod('PUT')).toBe(true);
    expect(isPayloadMethod('PATCH')).toBe(true);
    expect(isPayloadMethod('DELETE')).toBe(true);
  });

  it('returns false for non-payload methods', () => {
    expect(isPayloadMethod('GET')).toBe(false);
    expect(isPayloadMethod('HEAD')).toBe(false);
    expect(isPayloadMethod('OPTIONS')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isJSONSerializable
// ---------------------------------------------------------------------------

describe('isJSONSerializable', () => {
  it('returns false for undefined', () => {
    expect(isJSONSerializable(undefined)).toBe(false);
  });

  it('returns true for primitives', () => {
    expect(isJSONSerializable('hello')).toBe(true);
    expect(isJSONSerializable(42)).toBe(true);
    expect(isJSONSerializable(true)).toBe(true);
    expect(isJSONSerializable(null)).toBe(true);
  });

  it('returns false for functions, symbols, bigints', () => {
    expect(isJSONSerializable(() => {})).toBe(false);
    expect(isJSONSerializable(Symbol('x'))).toBe(false);
    expect(isJSONSerializable(42n)).toBe(false);
  });

  it('returns true for plain arrays', () => {
    expect(isJSONSerializable([1, 2, 3])).toBe(true);
  });

  it('returns false for ArrayBuffer-like values', () => {
    expect(isJSONSerializable(new Uint8Array([1, 2]))).toBe(false);
  });

  it('returns false for FormData and URLSearchParams', () => {
    expect(isJSONSerializable(new FormData())).toBe(false);
    expect(isJSONSerializable(new URLSearchParams())).toBe(false);
  });

  it('returns true for plain objects', () => {
    expect(isJSONSerializable({ a: 1 })).toBe(true);
  });

  it('returns true for objects with toJSON', () => {
    expect(isJSONSerializable({ toJSON: () => ({}) })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// detectResponseType
// ---------------------------------------------------------------------------

describe('detectResponseType', () => {
  it('defaults to json when content-type is empty', () => {
    expect(detectResponseType('')).toBe('json');
    expect(detectResponseType()).toBe('json');
  });

  it('detects json content types', () => {
    expect(detectResponseType('application/json')).toBe('json');
    expect(detectResponseType('application/json; charset=utf-8')).toBe('json');
    expect(detectResponseType('application/vnd.api+json')).toBe('json');
  });

  it('detects event-stream as stream', () => {
    expect(detectResponseType('text/event-stream')).toBe('stream');
  });

  it('detects text content types', () => {
    expect(detectResponseType('text/plain')).toBe('text');
    expect(detectResponseType('text/html')).toBe('text');
    expect(detectResponseType('application/xml')).toBe('text');
  });

  it('falls back to blob for binary types', () => {
    expect(detectResponseType('image/png')).toBe('blob');
    expect(detectResponseType('application/octet-stream')).toBe('blob');
  });
});

// ---------------------------------------------------------------------------
// buildURL
// ---------------------------------------------------------------------------

describe('buildURL', () => {
  it('appends query params to a clean URL', () => {
    expect(buildURL('https://api.example.com', { page: 1, limit: 20 })).toBe(
      'https://api.example.com?page=1&limit=20',
    );
  });

  it('appends to an existing query string with &', () => {
    expect(buildURL('https://api.example.com?foo=bar', { baz: 'qux' })).toBe(
      'https://api.example.com?foo=bar&baz=qux',
    );
  });

  it('omits null and undefined values', () => {
    expect(buildURL('https://api.example.com', { a: null, b: undefined, c: 'keep' })).toBe(
      'https://api.example.com?c=keep',
    );
  });

  it('returns the URL unchanged when all params are omitted', () => {
    expect(buildURL('https://api.example.com', { a: null })).toBe('https://api.example.com');
  });
});

// ---------------------------------------------------------------------------
// joinURL
// ---------------------------------------------------------------------------

describe('joinURL', () => {
  it('joins base and path correctly', () => {
    expect(joinURL('https://api.example.com/v1', '/users')).toBe(
      'https://api.example.com/v1/users',
    );
  });

  it('does not double slashes', () => {
    expect(joinURL('https://api.example.com/v1/', '/users')).toBe(
      'https://api.example.com/v1/users',
    );
  });

  it('adds a slash when neither side has one', () => {
    expect(joinURL('https://api.example.com/v1', 'users')).toBe(
      'https://api.example.com/v1/users',
    );
  });

  it('returns base when path is empty', () => {
    expect(joinURL('https://api.example.com', '')).toBe('https://api.example.com');
  });

  it('returns base when path is "/"', () => {
    expect(joinURL('https://api.example.com', '/')).toBe('https://api.example.com');
  });
});

// ---------------------------------------------------------------------------
// callHooks
// ---------------------------------------------------------------------------

describe('callHooks', () => {
  function makeCtx(): FetchContext {
    return {
      request: 'https://example.com',
      options: { headers: new Headers() },
      response: undefined,
      error: undefined,
    } as FetchContext;
  }

  it('does nothing when hooks is undefined', async () => {
    await expect(callHooks(makeCtx(), undefined)).resolves.toBeUndefined();
  });

  it('calls a single hook', async () => {
    const calls: number[] = [];
    await callHooks(makeCtx(), () => {
      calls.push(1);
    });
    expect(calls).toEqual([1]);
  });

  it('calls an array of hooks in order', async () => {
    const calls: number[] = [];
    await callHooks(makeCtx(), [
      () => { calls.push(1); },
      () => { calls.push(2); },
      () => { calls.push(3); },
    ]);
    expect(calls).toEqual([1, 2, 3]);
  });

  it('awaits async hooks', async () => {
    const calls: number[] = [];
    await callHooks(makeCtx(), [
      async () => {
        await Promise.resolve();
        calls.push(1);
      },
      () => {
        calls.push(2);
      },
    ]);
    expect(calls).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// resolveFetchOptions
// ---------------------------------------------------------------------------

describe('resolveFetchOptions', () => {
  it('returns an object with a Headers instance', () => {
    const resolved = resolveFetchOptions('https://example.com', undefined, undefined);
    expect(resolved.headers).toBeInstanceOf(Headers);
  });

  it('merges input and default headers (input wins)', () => {
    const resolved = resolveFetchOptions(
      'https://example.com',
      { headers: { 'x-custom': 'input' } },
      { headers: { 'x-custom': 'default', 'x-default-only': 'yes' } },
    );
    expect(resolved.headers.get('x-custom')).toBe('input');
    expect(resolved.headers.get('x-default-only')).toBe('yes');
  });

  it('merges query params from defaults and input', () => {
    const resolved = resolveFetchOptions(
      'https://example.com',
      { query: { a: '1' } },
      { query: { b: '2' } },
    );
    expect(resolved.query).toEqual({ a: '1', b: '2' });
  });

  it('merges params alias into query', () => {
    const resolved = resolveFetchOptions(
      'https://example.com',
      { params: { p: '10' } },
      undefined,
    );
    expect(resolved.query).toEqual({ p: '10' });
    expect(resolved.params).toEqual({ p: '10' });
  });
});
