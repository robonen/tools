import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useCookie } from '.';
import type { CookieStorageLike } from '.';

function flushWrites() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function rawCookie(name: string): string | null {
  const pair = document.cookie.split('; ').find(part => part.startsWith(`${name}=`));

  return pair ? pair.slice(name.length + 1) : null;
}

/**
 * Minimal in-memory `document` for asserting the exact strings assigned to
 * `document.cookie` (jsdom normalizes attributes away on read-back).
 */
function createFakeDocument() {
  const jar = new Map<string, string>();
  const writes: string[] = [];

  return {
    writes,
    document: {
      get cookie() {
        return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
      },
      set cookie(input: string) {
        writes.push(input);

        const [pair = ''] = input.split(';');
        const separator = pair.indexOf('=');
        const name = pair.slice(0, separator);
        const value = pair.slice(separator + 1);

        if (/Max-Age=(?:0|-\d+)/i.test(input))
          jar.delete(name);
        else
          jar.set(name, value);
      },
    } as unknown as Document,
  };
}

/**
 * Minimal Cookie Store API fake: same `get`/`set`/`delete` surface, fires the
 * `change` event as a macrotask after each commit (like real browsers).
 */
class FakeCookieStore extends EventTarget {
  jar = new Map<string, string>();
  setCalls: CookieInit[] = [];
  deleteCalls: CookieStoreDeleteOptions[] = [];

  async get(name: string): Promise<CookieListItem | null> {
    return this.jar.has(name) ? { name, value: this.jar.get(name)! } : null;
  }

  async set(init: CookieInit): Promise<void> {
    this.setCalls.push(init);
    this.jar.set(init.name, init.value);
    setTimeout(() => this.fireChange([{ name: init.name, value: init.value }], []), 0);
  }

  async delete(options: CookieStoreDeleteOptions): Promise<void> {
    this.deleteCalls.push(options);
    this.jar.delete(options.name);
    setTimeout(() => this.fireChange([], [{ name: options.name }]), 0);
  }

  fireChange(changed: CookieListItem[], deleted: CookieListItem[]) {
    this.dispatchEvent(Object.assign(new Event('change'), { changed, deleted }));
  }
}

function createCookieStoreWindow() {
  const cookieStore = new FakeCookieStore();
  const fakeWindow = Object.create(globalThis) as Window;

  Object.defineProperty(fakeWindow, 'cookieStore', { value: cookieStore });

  return { cookieStore, window: fakeWindow };
}

describe(useCookie, () => {
  describe('document.cookie fallback', () => {
    // --- Basic read/write ---

    it('reads an existing cookie synchronously and is ready immediately', () => {
      document.cookie = 'uc-read=stored; Path=/';

      const { state, isReady } = useCookie('uc-read', 'default');

      expect(state.value).toBe('stored');
      expect(isReady.value).toBeTruthy();
    });

    it('is awaitable and resolves with the shell', async () => {
      document.cookie = 'uc-await=stored; Path=/';

      const { state, isReady } = await useCookie('uc-await', 'default');

      expect(state.value).toBe('stored');
      expect(isReady.value).toBeTruthy();
    });

    it('writes the cookie on state change', async () => {
      const { state } = useCookie<string>('uc-write', 'initial');

      state.value = 'updated';
      await nextTick();
      await flushWrites();

      expect(rawCookie('uc-write')).toBe('updated');
    });

    it('deletes the cookie when state is set to null', async () => {
      document.cookie = 'uc-del=exists; Path=/';

      const { state } = useCookie<string | null>('uc-del', 'default');

      state.value = null;
      await nextTick();
      await flushWrites();

      expect(rawCookie('uc-del')).toBeNull();
    });

    // --- writeDefaults ---

    it('persists the default when the cookie does not exist', async () => {
      useCookie('uc-defaults', 'fallback');
      await flushWrites();

      expect(rawCookie('uc-defaults')).toBe('fallback');
    });

    it('does not persist the default when writeDefaults is false', async () => {
      useCookie('uc-no-defaults', 'fallback', { writeDefaults: false });
      await flushWrites();

      expect(rawCookie('uc-no-defaults')).toBeNull();
    });

    // --- Serialization & encoding ---

    it('round-trips objects through encoding', async () => {
      const { state } = useCookie('uc-obj', { theme: 'dark', items: [1, 2] });

      state.value = { theme: 'light', items: [3] };
      await nextTick();
      await flushWrites();

      const { state: other } = useCookie('uc-obj', { theme: 'none', items: [] as number[] });

      expect(other.value).toEqual({ theme: 'light', items: [3] });
    });

    it('percent-encodes values that cookies cannot contain', async () => {
      const { state } = useCookie<string>('uc-enc', '');

      state.value = 'a;b c';
      await nextTick();
      await flushWrites();

      expect(rawCookie('uc-enc')).toBe('a%3Bb%20c');
    });

    it('encodes the cookie name', async () => {
      const { state } = useCookie<string>('uc enc name', '');

      state.value = 'v';
      await nextTick();
      await flushWrites();

      expect(rawCookie('uc%20enc%20name')).toBe('v');
    });

    it('uses a custom serializer', async () => {
      document.cookie = 'uc-ser=1,2,3; Path=/';

      const serializer = {
        read: (v: string) => v.split(',').map(Number),
        write: (v: number[]) => v.join(','),
      };

      const { state } = useCookie('uc-ser', [0], { serializer });

      expect(state.value).toEqual([1, 2, 3]);

      state.value = [4, 5];
      await nextTick();
      await flushWrites();

      // The comma is percent-encoded at the cookie layer, below the serializer.
      expect(rawCookie('uc-ser')).toBe('4%2C5');

      const { state: other } = useCookie('uc-ser', [0], { serializer });

      expect(other.value).toEqual([4, 5]);
    });

    // --- Merge defaults ---

    it('merges defaults with the stored value', () => {
      document.cookie = `uc-merge=${encodeURIComponent(JSON.stringify({ hello: 'stored' }))}; Path=/`;

      const { state } = useCookie('uc-merge', { hello: 'default', greeting: 'hi' }, { mergeDefaults: true });

      expect(state.value).toEqual({ hello: 'stored', greeting: 'hi' });
    });

    // --- Attributes ---

    it('applies cookie attributes to every write', async () => {
      const { writes, document: fakeDocument } = createFakeDocument();

      const { state } = useCookie<string>('uc-attrs', 'v', {
        document: fakeDocument,
        path: '/app',
        domain: 'example.com',
        maxAge: 3600,
        secure: true,
        sameSite: 'strict',
      });

      await flushWrites();

      state.value = 'next';
      await nextTick();
      await flushWrites();

      expect(writes).toHaveLength(2);
      for (const write of writes)
        expect(write).toContain('Path=/app; Domain=example.com; SameSite=Strict; Max-Age=3600; Secure');
    });

    it('repeats identity attributes when deleting', async () => {
      const { writes, document: fakeDocument } = createFakeDocument();

      const { state } = useCookie<string | null>('uc-del-attrs', 'v', {
        document: fakeDocument,
        path: '/app',
      });

      await flushWrites();

      state.value = null;
      await nextTick();
      await flushWrites();

      expect(writes.at(-1)).toContain('uc-del-attrs=; Path=/app');
      expect(writes.at(-1)).toContain('Max-Age=0');
    });

    it('reports invalid attribute combinations through onError', async () => {
      const onError = vi.fn();

      const { state } = useCookie<string>('uc-invalid', 'v', {
        sameSite: 'none',
        secure: false,
        writeDefaults: false,
        onError,
      });

      state.value = 'next';
      await nextTick();
      await flushWrites();

      expect(onError).toHaveBeenCalledOnce();
      expect(rawCookie('uc-invalid')).toBeNull();
    });

    // --- Multi-instance sync (BroadcastChannel ping + local re-read) ---

    it('syncs two instances through BroadcastChannel', async () => {
      const writer = useCookie<string>('uc-sync', 'initial');
      const reader = useCookie<string>('uc-sync', 'initial');

      writer.state.value = 'from-writer';
      await nextTick();
      // Channel delivery is a task — give it two macrotask turns
      await flushWrites();
      await flushWrites();
      await nextTick();

      expect(reader.state.value).toBe('from-writer');
    });

    it('syncs two instances through the CustomEvent fallback without BroadcastChannel', async () => {
      vi.stubGlobal('BroadcastChannel', undefined);

      try {
        const writer = useCookie<string>('uc-sync-ce', 'initial');
        const reader = useCookie<string>('uc-sync-ce', 'initial');

        writer.state.value = 'from-writer';
        await nextTick();
        await flushWrites();
        await nextTick();

        expect(reader.state.value).toBe('from-writer');
      }
      finally {
        vi.unstubAllGlobals();
      }
    });

    it('does not echo a write back into its own instance', async () => {
      const { state } = useCookie<string>('uc-echo', 'initial');

      state.value = 'next';
      await nextTick();
      await flushWrites();
      await nextTick();
      await flushWrites();

      expect(state.value).toBe('next');
      expect(rawCookie('uc-echo')).toBe('next');
    });

    // --- Reactive name ---

    it('re-reads when the reactive name changes', async () => {
      document.cookie = 'uc-name-a=value-a; Path=/';
      document.cookie = 'uc-name-b=value-b; Path=/';

      const nameRef = ref('uc-name-a');
      const { state } = useCookie<string>(nameRef, 'default');

      expect(state.value).toBe('value-a');

      nameRef.value = 'uc-name-b';
      await nextTick();
      await flushWrites();

      expect(state.value).toBe('value-b');
      expect(rawCookie('uc-name-a')).toBe('value-a');
    });

    // --- eventFilter ---

    it('applies the event filter to writes', async () => {
      let captured: (() => void) | undefined;

      const { state } = useCookie<string>('uc-filter', 'initial', {
        eventFilter: (invoke) => { captured = invoke; },
        writeDefaults: false,
      });

      state.value = 'filtered';
      await nextTick();
      await flushWrites();

      expect(rawCookie('uc-filter')).toBeNull();
      expect(captured).toBeDefined();

      captured!();
      await flushWrites();

      expect(rawCookie('uc-filter')).toBe('filtered');
    });

    // --- Error handling ---

    it('falls back to defaults and reports through onError when deserialization fails', () => {
      document.cookie = 'uc-bad=not-json; Path=/';
      const onError = vi.fn();

      const { state } = useCookie('uc-bad', { ok: true }, { onError });

      expect(onError).toHaveBeenCalledOnce();
      expect(state.value).toEqual({ ok: true });
    });
  });

  describe('cookie Store API', () => {
    let cookieStore: FakeCookieStore;
    let storeWindow: Window;

    beforeEach(() => {
      ({ cookieStore, window: storeWindow } = createCookieStoreWindow());
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('reads asynchronously: defaults until ready, stored value after', async () => {
      cookieStore.jar.set('cs-read', 'stored');

      const result = useCookie('cs-read', 'default', { window: storeWindow });

      expect(result.state.value).toBe('default');
      expect(result.isReady.value).toBeFalsy();

      const { state, isReady } = await result;

      expect(state.value).toBe('stored');
      expect(isReady.value).toBeTruthy();
    });

    it('writes through cookieStore.set with the configured attributes', async () => {
      const { state } = await useCookie<string>('cs-write', 'initial', {
        window: storeWindow,
        path: '/app',
        sameSite: 'strict',
        maxAge: 3600,
      });

      const before = Date.now();

      state.value = 'updated';
      await nextTick();
      await flushWrites();

      expect(cookieStore.jar.get('cs-write')).toBe('updated');

      const call = cookieStore.setCalls.at(-1)!;

      expect(call.path).toBe('/app');
      expect(call.sameSite).toBe('strict');
      expect(call.expires).toBeGreaterThanOrEqual(before + 3600 * 1000 - 1000);
      expect(call.expires).toBeLessThanOrEqual(Date.now() + 3600 * 1000 + 1000);
    });

    it('deletes through cookieStore.delete when state is set to null', async () => {
      cookieStore.jar.set('cs-del', 'exists');

      const { state } = await useCookie<string | null>('cs-del', 'default', {
        window: storeWindow,
        path: '/app',
      });

      state.value = null;
      await nextTick();
      await flushWrites();

      expect(cookieStore.jar.has('cs-del')).toBeFalsy();
      expect(cookieStore.deleteCalls.at(-1)).toMatchObject({ name: 'cs-del', path: '/app' });
    });

    it('persists defaults through cookieStore when the cookie is missing', async () => {
      await useCookie('cs-defaults', 'fallback', { window: storeWindow });
      await flushWrites();

      expect(cookieStore.jar.get('cs-defaults')).toBe('fallback');
    });

    it('updates state on an external change event', async () => {
      cookieStore.jar.set('cs-ext', 'initial');

      const { state } = await useCookie('cs-ext', 'default', { window: storeWindow });

      cookieStore.jar.set('cs-ext', 'external');
      cookieStore.fireChange([{ name: 'cs-ext', value: 'external' }], []);
      await nextTick();

      expect(state.value).toBe('external');
    });

    it('resets to defaults on an external delete event', async () => {
      cookieStore.jar.set('cs-ext-del', 'stored');

      const { state } = await useCookie('cs-ext-del', 'default', { window: storeWindow });

      expect(state.value).toBe('stored');

      cookieStore.jar.delete('cs-ext-del');
      cookieStore.fireChange([], [{ name: 'cs-ext-del' }]);
      await nextTick();

      expect(state.value).toBe('default');
    });

    it('ignores change events for other cookies', async () => {
      cookieStore.jar.set('cs-other', 'mine');

      const { state } = await useCookie('cs-other', 'default', { window: storeWindow });

      cookieStore.fireChange([{ name: 'unrelated', value: 'x' }], []);
      await nextTick();

      expect(state.value).toBe('mine');
    });

    it('does not bounce its own change-event echo back into the state', async () => {
      const { state } = await useCookie<string>('cs-echo', 'initial', { window: storeWindow, writeDefaults: false });

      state.value = 'a';
      await nextTick();
      state.value = 'b';
      await nextTick();

      // Let queued writes and their macrotask change events all land.
      await flushWrites();
      await flushWrites();
      await nextTick();
      await flushWrites();

      expect(state.value).toBe('b');
      expect(cookieStore.jar.get('cs-echo')).toBe('b');
    });

    it('converges two instances writing conflicting values in the same tick', async () => {
      cookieStore.jar.set('cs-conflict', 'initial');

      const a = await useCookie<string>('cs-conflict', 'initial', { window: storeWindow });
      const b = await useCookie<string>('cs-conflict', 'initial', { window: storeWindow });

      a.state.value = 'from-a';
      b.state.value = 'from-b';
      await nextTick();

      // Let queued writes, macrotask change events, and reconciling re-reads settle
      for (let round = 0; round < 8; round++)
        await flushWrites();
      await nextTick();
      await flushWrites();

      const final = cookieStore.jar.get('cs-conflict');

      expect(a.state.value).toBe(final);
      expect(b.state.value).toBe(final);
    });

    it('stops writing once the owning scope is disposed, even after async init', async () => {
      const scope = effectScope();

      const result = scope.run(() => useCookie<string>('cs-scope', 'init', { window: storeWindow }))!;
      const { state } = await result;
      await flushWrites();

      const writesBefore = cookieStore.setCalls.length;

      scope.stop();

      state.value = 'after-stop';
      await nextTick();
      await flushWrites();

      expect(cookieStore.setCalls).toHaveLength(writesBefore);
    });

    it('forces the document.cookie path when secure is explicitly false', async () => {
      const { state } = await useCookie<string>('cs-insecure', 'initial', {
        window: storeWindow,
        secure: false,
        writeDefaults: false,
      });

      state.value = 'plain';
      await nextTick();
      await flushWrites();

      expect(cookieStore.setCalls).toHaveLength(0);
      expect(rawCookie('cs-insecure')).toBe('plain');
    });
  });

  describe('custom store', () => {
    /**
     * In-memory CookieStorageLike — the kind of adapter a framework (e.g.
     * Nuxt) would provide to bridge a server request context.
     */
    function createMemoryCookieStore() {
      const jar = new Map<string, string>();
      const listeners = new Map<string, Set<(value: string | null) => void>>();

      function notify(name: string, value: string | null) {
        listeners.get(name)?.forEach(callback => callback(value));
      }

      const store: CookieStorageLike = {
        getItem: name => jar.get(name) ?? null,
        setItem: (name, value) => {
          jar.set(name, value);
          notify(name, value);
        },
        removeItem: (name) => {
          jar.delete(name);
          notify(name, null);
        },
        onChange: (name, callback) => {
          if (!listeners.has(name))
            listeners.set(name, new Set());

          listeners.get(name)!.add(callback);

          return () => listeners.get(name)!.delete(callback);
        },
      };

      return { jar, notify, store };
    }

    const ssr = { window: null as unknown as Window, document: null as unknown as Document };

    it('works without window and document when a store is provided (server)', async () => {
      const { jar, store } = createMemoryCookieStore();
      jar.set('srv', 'from-request');

      const { state, isReady } = useCookie<string>('srv', 'default', { ...ssr, store });

      // A synchronous backend initializes synchronously
      expect(isReady.value).toBeTruthy();
      expect(state.value).toBe('from-request');

      state.value = 'updated';
      await nextTick();
      await flushWrites();

      expect(jar.get('srv')).toBe('updated');
    });

    it('prefers the provided store over the environment', async () => {
      const { jar, store } = createMemoryCookieStore();
      document.cookie = 'custom-pref=from-document; Path=/';
      jar.set('custom-pref', 'from-store');

      const { state } = await useCookie('custom-pref', 'default', { store });

      expect(state.value).toBe('from-store');
    });

    it('applies external changes from the store subscription without echoing them back', async () => {
      const { jar, store, notify } = createMemoryCookieStore();
      const setItem = vi.spyOn(store, 'setItem');

      const { state } = useCookie('sub', 'initial', { ...ssr, store });
      await flushWrites();

      jar.set('sub', 'external');
      notify('sub', 'external');
      await nextTick();
      await flushWrites();

      expect(state.value).toBe('external');
      // Only the writeDefaults write — the external change must not bounce back
      expect(setItem).toHaveBeenCalledTimes(1);
    });

    it('converges two instances writing conflicting values in the same tick', async () => {
      const { jar, store } = createMemoryCookieStore();
      jar.set('conflict', 'initial');

      const a = useCookie<string>('conflict', 'initial', { ...ssr, store });
      const b = useCookie<string>('conflict', 'initial', { ...ssr, store });

      a.state.value = 'from-a';
      b.state.value = 'from-b';
      await nextTick();
      await flushWrites();
      await flushWrites();
      await nextTick();
      await flushWrites();

      const final = jar.get('conflict');

      expect(a.state.value).toBe(final);
      expect(b.state.value).toBe(final);
    });

    it('finishes an in-flight write against the old name after a same-tick name switch', async () => {
      const { jar, store } = createMemoryCookieStore();
      jar.set('switch-a', 'va0');
      jar.set('switch-b', 'vb0');

      const nameRef = ref('switch-a');
      const { state } = useCookie<string>(nameRef, 'default', { ...ssr, store });

      state.value = 'new-a';
      nameRef.value = 'switch-b';
      await nextTick();
      await flushWrites();
      await nextTick();
      await flushWrites();

      // The write lands on the cookie it was meant for, never on the new one
      expect(jar.get('switch-a')).toBe('new-a');
      expect(jar.get('switch-b')).toBe('vb0');
      expect(state.value).toBe('vb0');
    });

    it('resubscribes when the reactive name changes', async () => {
      const { jar, store, notify } = createMemoryCookieStore();
      jar.set('name-a', 'value-a');
      jar.set('name-b', 'value-b');

      const nameRef = ref('name-a');
      const { state } = useCookie<string>(nameRef, 'default', { ...ssr, store });

      expect(state.value).toBe('value-a');

      nameRef.value = 'name-b';
      await nextTick();
      await flushWrites();

      expect(state.value).toBe('value-b');

      // The old subscription is gone, the new one is live
      jar.set('name-a', 'stale');
      notify('name-a', 'stale');
      await nextTick();

      expect(state.value).toBe('value-b');

      jar.set('name-b', 'fresh');
      notify('name-b', 'fresh');
      await nextTick();

      expect(state.value).toBe('fresh');
    });
  });

  describe('ssr', () => {
    it('returns an immediately-ready in-memory ref without window and document', async () => {
      // Explicit `undefined` would fall back to the defaults via destructuring,
      // so simulate the server with nulls.
      const ssr = { window: null as unknown as Window, document: null as unknown as Document };

      const { state, isReady } = useCookie<string>('ssr-key', 'default', ssr);

      expect(state.value).toBe('default');
      expect(isReady.value).toBeTruthy();

      state.value = 'changed';
      await nextTick();

      expect(state.value).toBe('changed');

      const awaited = await useCookie('ssr-key', 'default', ssr);

      expect(awaited.state.value).toBe('default');
    });
  });
});
