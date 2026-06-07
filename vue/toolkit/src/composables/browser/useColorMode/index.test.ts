import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useColorMode } from '.';

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

describe(useColorMode, () => {
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

  it('applies the system class when in auto mode (dark)', async () => {
    const prefersDark = makeMql(true);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode>;

    scope.run(() => {
      mode = useColorMode({ window: win });
    });
    await nextTick();

    expect(mode!.value).toBe('dark');
    expect(mode!.system.value).toBe('dark');
    expect(mode!.state.value).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBeTruthy();
    expect(document.documentElement.classList.contains('light')).toBeFalsy();

    scope.stop();
  });

  it('applies the system class when in auto mode (light)', async () => {
    const prefersDark = makeMql(false);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode>;

    scope.run(() => {
      mode = useColorMode({ window: win });
    });
    await nextTick();

    expect(mode!.system.value).toBe('light');
    expect(mode!.state.value).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBeTruthy();
    expect(document.documentElement.classList.contains('dark')).toBeFalsy();

    scope.stop();
  });

  it('writing the ref switches the applied class and removes the previous one', async () => {
    const prefersDark = makeMql(false);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode>;

    scope.run(() => {
      mode = useColorMode({ window: win });
    });
    await nextTick();

    expect(document.documentElement.classList.contains('light')).toBeTruthy();

    mode!.value = 'dark';
    await nextTick();

    expect(document.documentElement.classList.contains('dark')).toBeTruthy();
    expect(document.documentElement.classList.contains('light')).toBeFalsy();
    expect(mode!.value).toBe('dark');
    expect(mode!.store.value).toBe('dark');

    scope.stop();
  });

  it('reacts to system preference changes while in auto mode', async () => {
    const prefersDark = makeMql(false);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode>;

    scope.run(() => {
      mode = useColorMode({ window: win });
    });
    await nextTick();

    expect(mode!.state.value).toBe('light');

    prefersDark.dispatch(true);
    await nextTick();

    expect(mode!.system.value).toBe('dark');
    expect(mode!.state.value).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBeTruthy();

    scope.stop();
  });

  it('persists the value to storage and reads it back', async () => {
    const prefersDark = makeMql(false);
    const { win, storage } = makeWindow(prefersDark);
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode>;

    scope.run(() => {
      mode = useColorMode({ window: win });
    });
    await nextTick();

    mode!.value = 'dark';
    await nextTick();

    expect(storage.getItem('vuetools-color-scheme')).toBe('dark');

    // A second instance backed by the same storage should hydrate from it.
    let restored: ReturnType<typeof useColorMode>;
    scope.run(() => {
      restored = useColorMode({ window: win });
    });
    await nextTick();

    expect(restored!.value).toBe('dark');

    scope.stop();
  });

  it('honours a custom storageKey', async () => {
    const prefersDark = makeMql(false);
    const { win, storage } = makeWindow(prefersDark);
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode>;

    scope.run(() => {
      mode = useColorMode({ window: win, storageKey: 'my-theme' });
    });
    await nextTick();

    mode!.value = 'dark';
    await nextTick();

    expect(storage.getItem('my-theme')).toBe('dark');
    expect(storage.getItem('vuetools-color-scheme')).toBeNull();

    scope.stop();
  });

  it('does not persist when storageKey is null', async () => {
    const prefersDark = makeMql(false);
    const { win, map } = makeWindow(prefersDark);
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode>;

    scope.run(() => {
      mode = useColorMode({ window: win, storageKey: null });
    });
    await nextTick();

    mode!.value = 'dark';
    await nextTick();

    expect(map.size).toBe(0);
    expect(mode!.value).toBe('dark');

    scope.stop();
  });

  it('emitAuto keeps the ref value as "auto" while resolving state', async () => {
    const prefersDark = makeMql(true);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode>;

    scope.run(() => {
      mode = useColorMode({ window: win, emitAuto: true });
    });
    await nextTick();

    expect(mode!.value).toBe('auto');
    expect(mode!.state.value).toBe('dark');

    scope.stop();
  });

  it('writes to a custom attribute instead of class', async () => {
    const prefersDark = makeMql(true);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode>;

    scope.run(() => {
      mode = useColorMode({ window: win, attribute: 'data-theme' });
    });
    await nextTick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    mode!.value = 'light';
    await nextTick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    // Classes should not be touched in attribute mode.
    expect(document.documentElement.classList.contains('dark')).toBeFalsy();

    scope.stop();
  });

  it('supports custom modes', async () => {
    const prefersDark = makeMql(false);
    const { win } = makeWindow(prefersDark);
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode<'cafe' | 'dim'>>;

    scope.run(() => {
      mode = useColorMode<'cafe' | 'dim'>({
        window: win,
        modes: { cafe: 'cafe', dim: 'dim' },
        initialValue: 'cafe',
      });
    });
    await nextTick();

    expect(document.documentElement.classList.contains('cafe')).toBeTruthy();

    mode!.value = 'dim';
    await nextTick();

    expect(document.documentElement.classList.contains('dim')).toBeTruthy();
    expect(document.documentElement.classList.contains('cafe')).toBeFalsy();

    scope.stop();
  });

  it('invokes a custom onChanged handler instead of the default', async () => {
    const prefersDark = makeMql(true);
    const { win } = makeWindow(prefersDark);
    const onChanged = vi.fn();
    const scope = effectScope();

    scope.run(() => {
      useColorMode({ window: win, onChanged });
    });
    await nextTick();

    expect(onChanged).toHaveBeenCalled();
    const [firstMode, firstHandler] = onChanged.mock.calls[0]!;
    expect(firstMode).toBe('dark');
    expect(typeof firstHandler).toBe('function');
    // Default handler suppressed: no class applied.
    expect(document.documentElement.classList.contains('dark')).toBeFalsy();

    scope.stop();
  });

  it('uses a custom storageRef when provided', async () => {
    const prefersDark = makeMql(false);
    const { win, map } = makeWindow(prefersDark);
    const storageRef = ref<'auto' | 'dark' | 'light'>('dark');
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode>;

    scope.run(() => {
      mode = useColorMode({ window: win, storageRef });
    });
    await nextTick();

    expect(mode!.value).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBeTruthy();
    // storageRef bypasses useStorage, so nothing is written to localStorage.
    expect(map.size).toBe(0);

    storageRef.value = 'light';
    await nextTick();

    expect(document.documentElement.classList.contains('light')).toBeTruthy();

    scope.stop();
  });

  it('does not throw on the SSR/unsupported path (no window)', async () => {
    const scope = effectScope();
    let mode: ReturnType<typeof useColorMode>;

    expect(() => {
      scope.run(() => {
        mode = useColorMode({ window: undefined });
      });
    }).not.toThrow();
    await nextTick();

    // System detection unavailable -> defaults to light; state resolves to it.
    expect(mode!.system.value).toBe('light');
    expect(mode!.state.value).toBe('light');
    // In-memory store still writable.
    mode!.value = 'dark';
    await nextTick();
    expect(mode!.store.value).toBe('dark');

    scope.stop();
  });
});
