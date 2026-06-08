import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useUrlSearchParams } from '.';
import type { UrlSearchParamsMode, UseUrlSearchParamsOptions } from '.';

function mockWindow(href: string): Window {
  const url = new URL(href);
  const location = {
    get pathname() {
      return url.pathname;
    },
    get search() {
      return url.search;
    },
    get hash() {
      return url.hash;
    },
  };

  const listeners = new Map<string, Set<(ev: any) => void>>();

  const win = {
    location,
    document: { title: 'test' },
    history: {
      state: null as any,
      replaceState(state: any, _title: string, nextUrl: string) {
        this.state = state;
        const resolved = new URL(nextUrl, url.origin);
        url.pathname = resolved.pathname;
        url.search = resolved.search;
        url.hash = resolved.hash;
      },
      pushState(state: any, _title: string, nextUrl: string) {
        this.state = state;
        const resolved = new URL(nextUrl, url.origin);
        url.pathname = resolved.pathname;
        url.search = resolved.search;
        url.hash = resolved.hash;
      },
    },
    addEventListener(type: string, listener: (ev: any) => void) {
      if (!listeners.has(type))
        listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: (ev: any) => void) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type: string) {
      listeners.get(type)?.forEach(fn => fn({ type }));
    },
    // Allow tests to simulate external URL changes
    navigate(nextHref: string) {
      const resolved = new URL(nextHref, url.origin);
      url.pathname = resolved.pathname;
      url.search = resolved.search;
      url.hash = resolved.hash;
    },
    currentSearch() {
      return url.search;
    },
    currentHash() {
      return url.hash;
    },
  };

  return win as unknown as Window & {
    dispatch: (type: string) => void;
    navigate: (href: string) => void;
    currentSearch: () => string;
    currentHash: () => string;
  };
}

function run<T extends Record<string, any>>(
  mode: UrlSearchParamsMode,
  options: UseUrlSearchParamsOptions<T>,
): { scope: ReturnType<typeof effectScope>; params: T } {
  const scope = effectScope();
  let params!: T;
  scope.run(() => {
    params = useUrlSearchParams<T>(mode, options);
  });
  return { scope, params };
}

describe(useUrlSearchParams, () => {
  let scopes: Array<ReturnType<typeof effectScope>> = [];

  beforeEach(() => {
    scopes = [];
  });

  afterEach(() => {
    scopes.forEach(scope => scope.stop());
  });

  function track(scope: ReturnType<typeof effectScope>) {
    scopes.push(scope);
    return scope;
  }

  it('reads existing history params', () => {
    const window = mockWindow('http://localhost/?foo=bar&count=1');
    const { scope, params } = run('history', { window });
    track(scope);
    expect(params.foo).toBe('bar');
    expect(params.count).toBe('1');
  });

  it('decodes repeated keys into arrays', () => {
    const window = mockWindow('http://localhost/?id=1&id=2&id=3');
    const { scope, params } = run<{ id: string[] }>('history', { window });
    track(scope);
    expect(params.id).toEqual(['1', '2', '3']);
  });

  it('writes back to the URL when the state mutates', async () => {
    const window = mockWindow('http://localhost/') as any;
    const { scope, params } = run('history', { window });
    track(scope);

    params.foo = 'bar';
    await nextTick();
    expect(window.currentSearch()).toBe('?foo=bar');
  });

  it('writes array values as repeated keys', async () => {
    const window = mockWindow('http://localhost/') as any;
    const { scope, params } = run<{ id: string[] }>('history', { window });
    track(scope);

    params.id = ['1', '2'];
    await nextTick();
    expect(window.currentSearch()).toBe('?id=1&id=2');
  });

  it('seeds initialValue when the URL has no params', () => {
    const window = mockWindow('http://localhost/');
    const { scope, params } = run('history', { window, initialValue: { tab: 'home' } });
    track(scope);
    expect(params.tab).toBe('home');
  });

  it('ignores initialValue when the URL already has params', () => {
    const window = mockWindow('http://localhost/?tab=settings');
    const { scope, params } = run('history', { window, initialValue: { tab: 'home' } });
    track(scope);
    expect(params.tab).toBe('settings');
  });

  it('removes nullish values by default', async () => {
    const window = mockWindow('http://localhost/?foo=bar') as any;
    const { scope, params } = run<{ foo: any }>('history', { window });
    track(scope);

    params.foo = null;
    await nextTick();
    expect(window.currentSearch()).toBe('');
  });

  it('keeps falsy values unless removeFalsyValues is set', async () => {
    const windowKeep = mockWindow('http://localhost/') as any;
    const kept = run<{ foo: any }>('history', { window: windowKeep });
    track(kept.scope);
    kept.params.foo = '';
    await nextTick();
    expect(windowKeep.currentSearch()).toBe('?foo=');

    const windowDrop = mockWindow('http://localhost/') as any;
    const dropped = run<{ foo: any }>('history', { window: windowDrop, removeFalsyValues: true });
    track(dropped.scope);
    dropped.params.foo = '';
    await nextTick();
    expect(windowDrop.currentSearch()).toBe('');
  });

  it('syncs state when popstate fires', () => {
    const window = mockWindow('http://localhost/?foo=bar') as any;
    const { scope, params } = run('history', { window });
    track(scope);
    expect(params.foo).toBe('bar');

    window.navigate('http://localhost/?foo=baz&extra=1');
    window.dispatch('popstate');
    expect(params.foo).toBe('baz');
    expect(params.extra).toBe('1');
  });

  it('does not write back when write is disabled', () => {
    const window = mockWindow('http://localhost/?foo=bar') as any;
    const { scope, params } = run('history', { window, write: false });
    track(scope);

    window.navigate('http://localhost/?foo=changed');
    window.dispatch('popstate');
    // write:false short-circuits onChanged, so state is not updated from the event
    expect(params.foo).toBe('bar');
  });

  it('reads hash mode params', () => {
    const window = mockWindow('http://localhost/#/page?foo=bar');
    const { scope, params } = run('hash', { window });
    track(scope);
    expect(params.foo).toBe('bar');
  });

  it('writes hash mode params while preserving the hash path', async () => {
    const window = mockWindow('http://localhost/#/page') as any;
    const { scope, params } = run('hash', { window });
    track(scope);

    params.foo = 'bar';
    await nextTick();
    expect(window.currentHash()).toBe('#/page?foo=bar');
  });

  it('reads hash-params mode', () => {
    const window = mockWindow('http://localhost/#foo=bar&count=2');
    const { scope, params } = run('hash-params', { window });
    track(scope);
    expect(params.foo).toBe('bar');
    expect(params.count).toBe('2');
  });

  it('writes hash-params mode', async () => {
    const window = mockWindow('http://localhost/') as any;
    const { scope, params } = run('hash-params', { window });
    track(scope);

    params.foo = 'bar';
    await nextTick();
    expect(window.currentHash()).toBe('#foo=bar');
  });

  it('uses pushState when writeMode is push', async () => {
    const window = mockWindow('http://localhost/') as any;
    let pushed = 0;
    const originalPush = window.history.pushState.bind(window.history);
    window.history.pushState = function (state: any, title: string, url: string) {
      pushed++;
      return originalPush(state, title, url);
    };

    const { scope, params } = run('history', { window, writeMode: 'push' });
    track(scope);

    params.foo = 'bar';
    await nextTick();
    expect(pushed).toBe(1);
    expect(window.currentSearch()).toBe('?foo=bar');
  });

  it('applies a custom stringify', async () => {
    const window = mockWindow('http://localhost/') as any;
    const { scope, params } = run('history', {
      window,
      stringify: p => p.toString().toUpperCase(),
    });
    track(scope);

    params.foo = 'bar';
    await nextTick();
    expect(window.currentSearch()).toBe('?FOO=BAR');
  });

  it('removes deleted keys from the URL', async () => {
    const window = mockWindow('http://localhost/?a=1&b=2') as any;
    const { scope, params } = run<{ a?: string; b?: string }>('history', { window });
    track(scope);

    delete params.b;
    await nextTick();
    expect(window.currentSearch()).toBe('?a=1');
  });

  it('returns a reactive seeded object when window is unavailable (SSR)', () => {
    const scope = effectScope();
    track(scope);
    let params!: { foo: string };
    scope.run(() => {
      params = useUrlSearchParams<{ foo: string }>('history', {
        window: undefined,
        initialValue: { foo: 'bar' },
      });
    });
    expect(params.foo).toBe('bar');
    // Mutations are still reactive even without a window
    params.foo = 'baz';
    expect(params.foo).toBe('baz');
  });
});
