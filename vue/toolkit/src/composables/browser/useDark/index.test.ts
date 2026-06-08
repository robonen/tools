import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useDark } from '.';

type Listener = (event: { matches: boolean }) => void;

interface StubMql {
  readonly matches: boolean;
  media: string;
  addEventListener: (type: string, cb: Listener) => void;
  removeEventListener: (type: string, cb: Listener) => void;
  dispatch: (value: boolean) => void;
}

function makeMql(initialMatches: boolean, media = ''): StubMql {
  const listeners = new Set<Listener>();
  let matches = initialMatches;

  return {
    get matches() {
      return matches;
    },
    media,
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
    dispatch(value: boolean) {
      matches = value;
      for (const cb of listeners) cb({ matches: value });
    },
  };
}

/**
 * Build a stub `window` that reuses the real jsdom `document` (so DOM updates
 * applied to `<html>` are observable) but with a controllable `matchMedia` for
 * `prefers-color-scheme: dark`, an isolated in-memory `localStorage`, and a
 * `getComputedStyle` shim for the transition-disabling reflow.
 */
function makeWindow(prefersDark: StubMql) {
  const map = new Map<string, string>();

  const storage: Storage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => { map.set(key, String(value)); },
    removeItem: (key: string) => { map.delete(key); },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };

  const win = {
    document: globalThis.document,
    matchMedia: vi.fn((query: string) =>
      query.includes('dark') ? prefersDark : makeMql(false, query)),
    localStorage: storage,
    getComputedStyle: () => ({ opacity: '1' }),
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Window & typeof globalThis;

  return { win, storage, map };
}

function reset() {
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-theme');
}

describe(useDark, () => {
  beforeEach(() => {
    reset();
    // Ensure module-captured defaultWindow.matchMedia is undefined so the
    // composable must use the injected window.
    vi.stubGlobal('matchMedia', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    reset();
  });

  it('reflects the system preference in auto mode (dark)', async () => {
    const prefersDark = makeMql(true);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let isDark: ReturnType<typeof useDark>;

    scope.run(() => {
      isDark = useDark({ window: win });
    });
    await nextTick();

    expect(isDark!.value).toBeTruthy();
    expect(document.documentElement.classList.contains('dark')).toBeTruthy();

    scope.stop();
  });

  it('reflects the system preference in auto mode (light)', async () => {
    const prefersDark = makeMql(false);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let isDark: ReturnType<typeof useDark>;

    scope.run(() => {
      isDark = useDark({ window: win });
    });
    await nextTick();

    expect(isDark!.value).toBeFalsy();
    // Default valueLight is '' so no light class is applied.
    expect(document.documentElement.classList.contains('dark')).toBeFalsy();

    scope.stop();
  });

  it('writing true while the system prefers light applies the dark class', async () => {
    const prefersDark = makeMql(false);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let isDark: ReturnType<typeof useDark>;

    scope.run(() => {
      isDark = useDark({ window: win });
    });
    await nextTick();

    expect(isDark!.value).toBeFalsy();

    isDark!.value = true;
    await nextTick();

    expect(isDark!.value).toBeTruthy();
    expect(document.documentElement.classList.contains('dark')).toBeTruthy();

    scope.stop();
  });

  it('writing true while the system prefers dark falls back to auto', async () => {
    const prefersDark = makeMql(true);
    const { win, storage } = makeWindow(prefersDark);
    const scope = effectScope();
    let isDark: ReturnType<typeof useDark>;

    scope.run(() => {
      // Start from an explicit light value so the store is not already auto.
      isDark = useDark({ window: win });
    });
    await nextTick();

    isDark!.value = false;
    await nextTick();
    expect(storage.getItem('vuetools-color-scheme')).toBe('light');

    // System prefers dark, so requesting dark should resolve to 'auto'.
    isDark!.value = true;
    await nextTick();

    expect(isDark!.value).toBeTruthy();
    expect(storage.getItem('vuetools-color-scheme')).toBe('auto');

    scope.stop();
  });

  it('writing false while the system prefers dark falls back to auto', async () => {
    const prefersDark = makeMql(false);
    const { win, storage } = makeWindow(prefersDark);
    const scope = effectScope();
    let isDark: ReturnType<typeof useDark>;

    scope.run(() => {
      isDark = useDark({ window: win });
    });
    await nextTick();

    // System prefers light, so requesting light resolves to 'auto'.
    isDark!.value = false;
    await nextTick();

    expect(isDark!.value).toBeFalsy();
    expect(storage.getItem('vuetools-color-scheme')).toBe('auto');

    scope.stop();
  });

  it('reacts to system preference changes while in auto mode', async () => {
    const prefersDark = makeMql(false);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let isDark: ReturnType<typeof useDark>;

    scope.run(() => {
      isDark = useDark({ window: win });
    });
    await nextTick();

    expect(isDark!.value).toBeFalsy();

    prefersDark.dispatch(true);
    await nextTick();

    expect(isDark!.value).toBeTruthy();
    expect(document.documentElement.classList.contains('dark')).toBeTruthy();

    scope.stop();
  });

  it('honours custom valueDark / valueLight on a custom attribute', async () => {
    const prefersDark = makeMql(false);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let isDark: ReturnType<typeof useDark>;

    scope.run(() => {
      isDark = useDark({
        window: win,
        attribute: 'data-theme',
        valueDark: 'night',
        valueLight: 'day',
      });
    });
    await nextTick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('day');

    isDark!.value = true;
    await nextTick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('night');

    scope.stop();
  });

  it('persists to a custom storageKey', async () => {
    const prefersDark = makeMql(false);
    const { win, storage } = makeWindow(prefersDark);
    const scope = effectScope();
    let isDark: ReturnType<typeof useDark>;

    scope.run(() => {
      isDark = useDark({ window: win, storageKey: 'my-dark' });
    });
    await nextTick();

    isDark!.value = true;
    await nextTick();

    expect(storage.getItem('my-dark')).toBe('dark');
    expect(storage.getItem('vuetools-color-scheme')).toBeNull();

    scope.stop();
  });

  it('uses a custom storage backend', async () => {
    const prefersDark = makeMql(false);
    const { win } = makeWindow(prefersDark);
    const map = new Map<string, string>();
    const storage: Storage = {
      getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
      setItem: (key: string, value: string) => { map.set(key, String(value)); },
      removeItem: (key: string) => { map.delete(key); },
      clear: () => map.clear(),
      key: (index: number) => [...map.keys()][index] ?? null,
      get length() {
        return map.size;
      },
    };
    const scope = effectScope();
    let isDark: ReturnType<typeof useDark>;

    scope.run(() => {
      isDark = useDark({ window: win, storage });
    });
    await nextTick();

    isDark!.value = true;
    await nextTick();

    expect(map.get('vuetools-color-scheme')).toBe('dark');

    scope.stop();
  });

  it('invokes a custom onChanged handler with the boolean state', async () => {
    const prefersDark = makeMql(true);
    const { win } = makeWindow(prefersDark);
    const onChanged = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      useDark({ window: win, onChanged });
    });
    await nextTick();

    expect(onChanged).toHaveBeenCalled();
    const [boolValue, handler, mode] = onChanged.mock.calls[0]!;
    expect(boolValue).toBeTruthy();
    expect(typeof handler).toBe('function');
    expect(mode).toBe('dark');
    // Default handler suppressed: no class applied.
    expect(document.documentElement.classList.contains('dark')).toBeFalsy();

    scope.stop();
  });

  it('does not throw on the SSR/unsupported path (no window)', async () => {
    const scope = effectScope();
    let isDark: ReturnType<typeof useDark>;

    expect(() => {
      scope.run(() => {
        isDark = useDark({ window: undefined });
      });
    }).not.toThrow();
    await nextTick();

    // System detection unavailable -> defaults to light -> isDark false.
    expect(isDark!.value).toBeFalsy();

    // Still writable in memory.
    isDark!.value = true;
    await nextTick();
    expect(isDark!.value).toBeTruthy();

    scope.stop();
  });
});
