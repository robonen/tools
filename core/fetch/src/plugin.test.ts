import type { Fetch, FetchContext } from './types';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { FetchError } from './error';
import { createFetch } from './fetch';
import { definePlugin } from './plugin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchMock(
  body: unknown = { ok: true },
  init: ResponseInit = { status: 200 },
  contentType = 'application/json',
) {
  return vi.fn<Fetch>().mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      ...init,
      headers: { 'content-type': contentType, ...init.headers },
    }),
  );
}

// ---------------------------------------------------------------------------
// definePlugin — identity + inference
// ---------------------------------------------------------------------------

describe('definePlugin', () => {
  it('returns the plugin object verbatim', () => {
    const plugin = definePlugin({ name: 'noop' });
    expect(plugin.name).toBe('noop');
  });

  it('preserves the const Name generic', () => {
    const plugin = definePlugin({ name: 'auth' });
    expectTypeOf(plugin.name).toEqualTypeOf<'auth'>();
  });
});

// ---------------------------------------------------------------------------
// Defaults merging
// ---------------------------------------------------------------------------

describe('plugin defaults', () => {
  it('applies plugin defaults to every request', async () => {
    const fetchMock = makeFetchMock({});
    const baseUrl = definePlugin({
      name: 'baseUrl',
      defaults: { baseURL: 'https://api.example.com' },
    });
    const $fetch = createFetch({ fetch: fetchMock, plugins: [baseUrl] });

    await $fetch('/users');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('https://api.example.com/users');
  });

  it('user defaults override plugin defaults', async () => {
    const fetchMock = makeFetchMock({});
    const plugin = definePlugin({
      name: 'x',
      defaults: { baseURL: 'https://plugin.example.com' },
    });
    const $fetch = createFetch({
      fetch: fetchMock,
      plugins: [plugin],
      defaults: { baseURL: 'https://user.example.com' },
    });

    await $fetch('/x');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('https://user.example.com/x');
  });

  it('merges headers from plugin defaults and user defaults', async () => {
    const fetchMock = makeFetchMock({});
    const plugin = definePlugin({
      name: 'hdrs',
      defaults: { headers: { 'x-plugin': 'p' } },
    });
    const $fetch = createFetch({
      fetch: fetchMock,
      plugins: [plugin],
      defaults: { headers: { 'x-user': 'u' } },
    });

    await $fetch('https://api.example.com');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('x-plugin')).toBe('p');
    expect(headers.get('x-user')).toBe('u');
  });

  it('user headers win on conflict', async () => {
    const fetchMock = makeFetchMock({});
    const plugin = definePlugin({
      name: 'hdrs',
      defaults: { headers: { authorization: 'plugin' } },
    });
    const $fetch = createFetch({
      fetch: fetchMock,
      plugins: [plugin],
      defaults: { headers: { authorization: 'user' } },
    });

    await $fetch('https://api.example.com');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get('authorization')).toBe('user');
  });
});

// ---------------------------------------------------------------------------
// Hook ordering
// ---------------------------------------------------------------------------

describe('plugin hooks', () => {
  it('runs plugin hooks before per-request hooks', async () => {
    const fetchMock = makeFetchMock({});
    const calls: string[] = [];
    const plugin = definePlugin({
      name: 'a',
      hooks: {
        onRequest: () => {
          calls.push('plugin');
        },
      },
    });
    const $fetch = createFetch({ fetch: fetchMock, plugins: [plugin] });

    await $fetch('https://api.example.com', {
      onRequest: () => {
        calls.push('user');
      },
    });

    expect(calls).toEqual(['plugin', 'user']);
  });

  it('preserves plugin registration order across multiple plugins', async () => {
    const fetchMock = makeFetchMock({});
    const calls: string[] = [];
    const a = definePlugin({
      name: 'a',
      hooks: { onRequest: () => { calls.push('a'); } },
    });
    const b = definePlugin({
      name: 'b',
      hooks: { onRequest: () => { calls.push('b'); } },
    });
    const $fetch = createFetch({ fetch: fetchMock, plugins: [a, b] });

    await $fetch('https://api.example.com');

    expect(calls).toEqual(['a', 'b']);
  });

  it('supports arrays of hooks inside a single plugin', async () => {
    const fetchMock = makeFetchMock({});
    const calls: string[] = [];
    const plugin = definePlugin({
      name: 'multi',
      hooks: {
        onRequest: [
          () => { calls.push('1'); },
          () => { calls.push('2'); },
        ],
      },
    });
    const $fetch = createFetch({ fetch: fetchMock, plugins: [plugin] });

    await $fetch('https://api.example.com');

    expect(calls).toEqual(['1', '2']);
  });

  it('invokes onResponse hook for successful responses', async () => {
    const fetchMock = makeFetchMock({ id: 1 });
    const seen: number[] = [];
    const plugin = definePlugin({
      name: 'r',
      hooks: {
        onResponse: (ctx) => {
          if (ctx.response.status === 200) seen.push(ctx.response.status);
        },
      },
    });
    const $fetch = createFetch({ fetch: fetchMock, plugins: [plugin] });

    await $fetch('https://api.example.com');

    expect(seen).toEqual([200]);
  });

  it('invokes onResponseError hook for 4xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    const calls: string[] = [];
    const plugin = definePlugin({
      name: 'err',
      hooks: { onResponseError: () => { calls.push('err'); } },
    });
    const $fetch = createFetch({ fetch: fetchMock, plugins: [plugin] });

    await expect($fetch('https://api.example.com', { retry: false }))
      .rejects.toBeInstanceOf(FetchError);
    expect(calls).toEqual(['err']);
  });

  it('invokes onRequestError hook on network failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'));
    const calls: string[] = [];
    const plugin = definePlugin({
      name: 'net',
      hooks: { onRequestError: () => { calls.push('net'); } },
    });
    const $fetch = createFetch({ fetch: fetchMock, plugins: [plugin] });

    await expect($fetch('https://api.example.com', { retry: false }))
      .rejects.toBeInstanceOf(FetchError);
    expect(calls).toEqual(['net']);
  });
});

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------

describe('plugin setup', () => {
  it('is called exactly once per createFetch', async () => {
    const fetchMock = vi.fn<Fetch>().mockImplementation(async () =>
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const setup = vi.fn();
    const plugin = definePlugin({ name: 's', setup });

    const $fetch = createFetch({ fetch: fetchMock, plugins: [plugin] });
    expect(setup).toHaveBeenCalledTimes(1);

    await $fetch('https://api.example.com');
    await $fetch('https://api.example.com');
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it('receives the fully merged defaults', () => {
    const plugin = definePlugin({
      name: 'inspect',
      defaults: { baseURL: 'https://plugin.example.com' },
      setup: ({ defaults }) => {
        expect(defaults.baseURL).toBe('https://user.example.com');
      },
    });
    createFetch({
      fetch: makeFetchMock({}),
      plugins: [plugin],
      defaults: { baseURL: 'https://user.example.com' },
    });
  });
});

// ---------------------------------------------------------------------------
// extend / create — plugin inheritance
// ---------------------------------------------------------------------------

describe('extend inherits plugins', () => {
  it('child instance runs parent plugin hooks', async () => {
    const fetchMock = makeFetchMock({});
    const calls: string[] = [];
    const parentPlugin = definePlugin({
      name: 'parent',
      hooks: { onRequest: () => { calls.push('parent'); } },
    });
    const parent = createFetch({ fetch: fetchMock, plugins: [parentPlugin] });
    const child = parent.extend({});

    await child('https://api.example.com');

    expect(calls).toEqual(['parent']);
  });

  it('child plugin runs after parent plugin', async () => {
    const fetchMock = makeFetchMock({});
    const calls: string[] = [];
    const parentPlugin = definePlugin({
      name: 'parent',
      hooks: { onRequest: () => { calls.push('parent'); } },
    });
    const childPlugin = definePlugin({
      name: 'child',
      hooks: { onRequest: () => { calls.push('child'); } },
    });
    const parent = createFetch({ fetch: fetchMock, plugins: [parentPlugin] });
    const child = parent.extend({}, { plugins: [childPlugin] });

    await child('https://api.example.com', {
      onRequest: () => { calls.push('user'); },
    });

    expect(calls).toEqual(['parent', 'child', 'user']);
  });

  it('child defaults override parent defaults', async () => {
    const fetchMock = makeFetchMock({});
    const parent = createFetch({
      fetch: fetchMock,
      defaults: { baseURL: 'https://parent.example.com' },
    });
    const child = parent.extend({ baseURL: 'https://child.example.com' });

    await child('/x');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('https://child.example.com/x');
  });

  it('parent plugin defaults persist through extend', async () => {
    const fetchMock = makeFetchMock({});
    const plugin = definePlugin({
      name: 'base',
      defaults: { baseURL: 'https://plugin.example.com' },
    });
    const parent = createFetch({ fetch: fetchMock, plugins: [plugin] });
    const child = parent.extend({});

    await child('/x');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('https://plugin.example.com/x');
  });
});

// ---------------------------------------------------------------------------
// Zero-regression: instance without plugins behaves exactly like before
// ---------------------------------------------------------------------------

describe('no-plugin instances', () => {
  it('skips the hook fast-path when neither plugin nor user hooks are set', async () => {
    const fetchMock = makeFetchMock({ ok: true });
    const $fetch = createFetch({ fetch: fetchMock });

    const data = await $fetch<{ ok: boolean }>('https://api.example.com');

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Type-level checks — plugin OptionsExt flows into request options
// ---------------------------------------------------------------------------

describe('type inference', () => {
  it('adds plugin OptionsExt fields to request options', () => {
    const auth = definePlugin<'auth', { token?: string }>({ name: 'auth' });
    const _api = createFetch({ plugins: [auth] });

    // Valid usage — `token` is known to the type system.
    type ApiCall = Parameters<typeof _api>[1];
    expectTypeOf<ApiCall>().toMatchTypeOf<{ token?: string } | undefined>();
  });

  it('rejects unknown fields when no plugin declares them', () => {
    const api = createFetch();

    // @ts-expect-error — `token` is not a known option on a plugin-less instance.
    void (() => api('https://api.example.com', { token: 'x' }));
  });

  it('exposes context extension as a type-only carrier', () => {
    const trace = definePlugin<'trace', object, { traceId: string }>({
      name: 'trace',
    });

    expectTypeOf(trace.name).toEqualTypeOf<'trace'>();
    // Sanity: FetchContext at runtime is still the base shape; ContextExt is advisory.
    expectTypeOf<FetchContext>().toMatchTypeOf<{ request: unknown }>();
  });
});
