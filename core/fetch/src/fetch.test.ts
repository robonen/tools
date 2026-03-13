import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchError } from './error';
import { createFetch } from './fetch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchMock(
  body: unknown = { ok: true },
  init: ResponseInit = { status: 200 },
  contentType = 'application/json',
): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      ...init,
      headers: { 'content-type': contentType, ...init.headers },
    }),
  );
}

// ---------------------------------------------------------------------------
// Basic fetch
// ---------------------------------------------------------------------------

describe('createFetch — basic', () => {
  it('returns parsed JSON body', async () => {
    const fetchMock = makeFetchMock({ id: 1 });
    const $fetch = createFetch({ fetch: fetchMock });

    const data = await $fetch<{ id: number }>('https://api.example.com/user');

    expect(data).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('passes options through to the underlying fetch', async () => {
    const fetchMock = makeFetchMock({ done: true });
    const $fetch = createFetch({ fetch: fetchMock });

    await $fetch('https://api.example.com/task', {
      method: 'POST',
      headers: { 'x-token': 'abc' },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get('x-token')).toBe('abc');
    expect(init.method).toBe('POST');
  });

  it('uppercases the HTTP method', async () => {
    const fetchMock = makeFetchMock({});
    const $fetch = createFetch({ fetch: fetchMock });

    await $fetch('https://api.example.com', { method: 'post' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
  });
});

// ---------------------------------------------------------------------------
// raw
// ---------------------------------------------------------------------------

describe('$fetch.raw', () => {
  it('returns a Response with _data', async () => {
    const fetchMock = makeFetchMock({ value: 42 });
    const $fetch = createFetch({ fetch: fetchMock });

    const response = await $fetch.raw<{ value: number }>('https://api.example.com');

    expect(response).toBeInstanceOf(Response);
    expect(response._data).toEqual({ value: 42 });
    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Method shortcuts
// ---------------------------------------------------------------------------

describe('method shortcuts', () => {
  it('$fetch.get sends a GET request', async () => {
    const fetchMock = makeFetchMock({});
    const $fetch = createFetch({ fetch: fetchMock });
    await $fetch.get('https://api.example.com/items');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('GET');
  });

  it('$fetch.post sends a POST request', async () => {
    const fetchMock = makeFetchMock({});
    const $fetch = createFetch({ fetch: fetchMock });
    await $fetch.post('https://api.example.com/items', { body: { name: 'x' } });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
  });

  it('$fetch.put sends a PUT request', async () => {
    const fetchMock = makeFetchMock({});
    const $fetch = createFetch({ fetch: fetchMock });
    await $fetch.put('https://api.example.com/items/1', { body: { name: 'y' } });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('PUT');
  });

  it('$fetch.patch sends a PATCH request', async () => {
    const fetchMock = makeFetchMock({});
    const $fetch = createFetch({ fetch: fetchMock });
    await $fetch.patch('https://api.example.com/items/1', { body: { name: 'z' } });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('PATCH');
  });

  it('$fetch.delete sends a DELETE request', async () => {
    const fetchMock = makeFetchMock({});
    const $fetch = createFetch({ fetch: fetchMock });
    await $fetch.delete('https://api.example.com/items/1');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('DELETE');
  });
});

// ---------------------------------------------------------------------------
// baseURL
// ---------------------------------------------------------------------------

describe('baseURL', () => {
  it('prepends baseURL to a relative path', async () => {
    const fetchMock = makeFetchMock({});
    const $fetch = createFetch({ fetch: fetchMock });

    await $fetch('/users', { baseURL: 'https://api.example.com/v1' });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('https://api.example.com/v1/users');
  });

  it('inherits baseURL from create() defaults', async () => {
    const fetchMock = makeFetchMock({});
    const api = createFetch({ fetch: fetchMock }).create({ baseURL: 'https://api.example.com' });

    await api('/health');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('https://api.example.com/health');
  });
});

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

describe('query params', () => {
  it('appends query to the request URL', async () => {
    const fetchMock = makeFetchMock([]);
    const $fetch = createFetch({ fetch: fetchMock });

    await $fetch('https://api.example.com/items', { query: { page: 2, limit: 10 } });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
  });

  it('merges default query with per-request query', async () => {
    const fetchMock = makeFetchMock([]);
    const $fetch = createFetch({ fetch: fetchMock }).create({
      baseURL: 'https://api.example.com',
      query: { version: 2 },
    });

    await $fetch('/items', { query: { page: 1 } });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('version=2');
    expect(url).toContain('page=1');
  });
});

// ---------------------------------------------------------------------------
// JSON body serialisation
// ---------------------------------------------------------------------------

describe('JSON body serialisation', () => {
  it('serialises plain objects and sets content-type to application/json', async () => {
    const fetchMock = makeFetchMock({ ok: true });
    const $fetch = createFetch({ fetch: fetchMock });

    await $fetch('https://api.example.com/users', {
      method: 'POST',
      body: { name: 'Alice' },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe('{"name":"Alice"}');
    expect((init.headers as Headers).get('content-type')).toBe('application/json');
  });

  it('respects a pre-set content-type header', async () => {
    const fetchMock = makeFetchMock({ ok: true });
    const $fetch = createFetch({ fetch: fetchMock });

    await $fetch('https://api.example.com/form', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: { key: 'value' },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe('key=value');
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('error handling', () => {
  it('throws FetchError on 4xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"error":"not found"}', {
        status: 404,
        statusText: 'Not Found',
        headers: { 'content-type': 'application/json' },
      }),
    );
    const $fetch = createFetch({ fetch: fetchMock });

    await expect($fetch('https://api.example.com/missing')).rejects.toBeInstanceOf(FetchError);
  });

  it('throws FetchError on 5xx response', async () => {
    // Use mockImplementation so each retry attempt gets a fresh Response (body not yet read)
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' }));
    const $fetch = createFetch({ fetch: fetchMock });

    await expect($fetch('https://api.example.com/crash')).rejects.toThrow(FetchError);
  });

  it('does not throw when ignoreResponseError is true', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"error":"bad request"}', {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const $fetch = createFetch({ fetch: fetchMock });

    await expect(
      $fetch('https://api.example.com/bad', { ignoreResponseError: true }),
    ).resolves.toEqual({ error: 'bad request' });
  });

  it('throws FetchError on network error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const $fetch = createFetch({ fetch: fetchMock });

    await expect($fetch('https://api.example.com/offline')).rejects.toBeInstanceOf(FetchError);
  });
});

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

describe('retry', () => {
  it('retries once on 500 by default for GET', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('error', { status: 500 }))
      .mockResolvedValueOnce(
        new Response('{"ok":true}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    const $fetch = createFetch({ fetch: fetchMock });

    const data = await $fetch('https://api.example.com/flaky');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(data).toEqual({ ok: true });
  });

  it('does not retry POST by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('error', { status: 500 }));
    const $fetch = createFetch({ fetch: fetchMock });

    await expect(
      $fetch('https://api.example.com/task', { method: 'POST' }),
    ).rejects.toBeInstanceOf(FetchError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('respects retry: false', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('error', { status: 503 }));
    const $fetch = createFetch({ fetch: fetchMock });

    await expect(
      $fetch('https://api.example.com/flaky', { retry: false }),
    ).rejects.toBeInstanceOf(FetchError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('respects custom retryStatusCodes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 418 }))
      .mockResolvedValueOnce(
        new Response('{"ok":true}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    const $fetch = createFetch({ fetch: fetchMock });

    const data = await $fetch('https://api.example.com/teapot', {
      retryStatusCodes: [418],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(data).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

describe('lifecycle hooks', () => {
  it('calls onRequest before sending', async () => {
    const fetchMock = makeFetchMock({});
    const $fetch = createFetch({ fetch: fetchMock });
    const calls: string[] = [];

    await $fetch('https://api.example.com', {
      onRequest: () => {
        calls.push('request');
      },
    });

    expect(calls).toContain('request');
    expect(calls.indexOf('request')).toBeLessThan(1);
  });

  it('calls onResponse after a successful response', async () => {
    const fetchMock = makeFetchMock({ data: 1 });
    const $fetch = createFetch({ fetch: fetchMock });
    const calls: string[] = [];

    await $fetch('https://api.example.com', {
      onResponse: () => {
        calls.push('response');
      },
    });

    expect(calls).toContain('response');
  });

  it('calls onResponseError for 4xx responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    const $fetch = createFetch({ fetch: fetchMock });
    const calls: string[] = [];

    await expect(
      $fetch('https://api.example.com/protected', {
        retry: false,
        onResponseError: () => {
          calls.push('responseError');
        },
      }),
    ).rejects.toBeInstanceOf(FetchError);

    expect(calls).toContain('responseError');
  });

  it('calls onRequestError on network failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Network error'));
    const $fetch = createFetch({ fetch: fetchMock });
    const calls: string[] = [];

    await expect(
      $fetch('https://api.example.com/offline', {
        retry: false,
        onRequestError: () => {
          calls.push('requestError');
        },
      }),
    ).rejects.toBeInstanceOf(FetchError);

    expect(calls).toContain('requestError');
  });

  it('supports multiple hooks as an array', async () => {
    const fetchMock = makeFetchMock({});
    const $fetch = createFetch({ fetch: fetchMock });
    const calls: number[] = [];

    await $fetch('https://api.example.com', {
      onRequest: [
        () => {
          calls.push(1);
        },
        () => {
          calls.push(2);
        },
      ],
    });

    expect(calls).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// create / extend
// ---------------------------------------------------------------------------

describe('create and extend', () => {
  it('creates a new instance with merged defaults', async () => {
    const fetchMock = makeFetchMock({});
    const $fetch = createFetch({ fetch: fetchMock });
    const api = $fetch.create({ baseURL: 'https://api.example.com' });

    await api('/ping');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('https://api.example.com/ping');
  });

  it('extend is an alias for create', async () => {
    const fetchMock = makeFetchMock({});
    const $fetch = createFetch({ fetch: fetchMock });
    const api = $fetch.extend({ baseURL: 'https://api.example.com' });

    await api('/ping');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('https://api.example.com/ping');
  });
});

// ---------------------------------------------------------------------------
// Response type variants
// ---------------------------------------------------------------------------

describe('response types', () => {
  it('returns text when responseType is "text"', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('hello world', { headers: { 'content-type': 'text/plain' } }));
    const $fetch = createFetch({ fetch: fetchMock });

    const text = await $fetch<string, 'text'>('https://api.example.com/text', {
      responseType: 'text',
    });

    expect(text).toBe('hello world');
  });

  it('returns a Blob when responseType is "blob"', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('binary', { headers: { 'content-type': 'image/png' } }));
    const $fetch = createFetch({ fetch: fetchMock });

    const blob = await $fetch<Blob, 'blob'>('https://api.example.com/img', {
      responseType: 'blob',
    });

    expect(blob).toBeInstanceOf(Blob);
  });

  it('uses a custom parseResponse function', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('{"value":10}', { headers: { 'content-type': 'application/json' } }),
      );
    const $fetch = createFetch({ fetch: fetchMock });

    const data = await $fetch<{ value: number }>('https://api.example.com/custom', {
      parseResponse: text => ({ ...JSON.parse(text) as object, custom: true }),
    });

    expect(data).toEqual({ value: 10, custom: true });
  });
});

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------

describe('timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts a request that exceeds the timeout', async () => {
    // fetchMock that never resolves until the signal fires
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        (init.signal as AbortSignal).addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    const $fetch = createFetch({ fetch: fetchMock });

    const promise = $fetch('https://api.example.com/slow', { timeout: 100, retry: false });

    vi.advanceTimersByTime(200);

    await expect(promise).rejects.toBeInstanceOf(FetchError);
  });
});
