import { describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { usePreferredLanguages } from '.';
import type * as Types from '@/types';

type Listener = (event: Event) => void;

interface StubWindow {
  navigator: { languages: readonly string[] };
  addEventListener: (type: string, cb: Listener, options?: unknown) => void;
  removeEventListener: (type: string, cb: Listener) => void;
  dispatch: () => void;
  listenerCount: () => number;
  lastOptions: () => unknown;
}

/**
 * Build a minimal stub `window` whose `navigator.languages` is mutable and that
 * records its `languagechange` listeners so we can simulate the browser event.
 */
function makeWindow(initial: string[]): StubWindow {
  const listeners = new Set<Listener>();
  let languages: readonly string[] = initial;
  let captured: unknown;

  const stub: StubWindow = {
    navigator: {
      get languages() {
        return languages;
      },
    },
    addEventListener(type, cb, options) {
      if (type === 'languagechange') {
        listeners.add(cb);
        captured = options;
      }
    },
    removeEventListener(type, cb) {
      if (type === 'languagechange') listeners.delete(cb);
    },
    dispatch() {
      for (const cb of listeners) cb(new Event('languagechange'));
    },
    listenerCount: () => listeners.size,
    lastOptions: () => captured,
  };

  // Allow tests to mutate languages before dispatching.
  Object.defineProperty(stub, 'setLanguages', {
    value: (next: string[]) => { languages = next; },
  });

  return stub;
}

describe(usePreferredLanguages, () => {
  it('reads the initial navigator.languages', () => {
    const win = makeWindow(['en-US', 'en']);
    const scope = effectScope();
    let langs: ReturnType<typeof usePreferredLanguages>;
    scope.run(() => {
      langs = usePreferredLanguages({ window: win as unknown as Window });
    });

    expect(langs!.value).toEqual(['en-US', 'en']);
    scope.stop();
  });

  it('updates on languagechange', () => {
    const win = makeWindow(['en']);
    const scope = effectScope();
    let langs: ReturnType<typeof usePreferredLanguages>;
    scope.run(() => {
      langs = usePreferredLanguages({ window: win as unknown as Window });
    });

    (win as unknown as { setLanguages: (n: string[]) => void }).setLanguages(['fr-FR', 'fr', 'en']);
    win.dispatch();

    expect(langs!.value).toEqual(['fr-FR', 'fr', 'en']);
    scope.stop();
  });

  it('registers the listener with a passive option', () => {
    const win = makeWindow(['en']);
    const scope = effectScope();
    scope.run(() => {
      usePreferredLanguages({ window: win as unknown as Window });
    });

    expect(win.listenerCount()).toBe(1);
    expect(win.lastOptions()).toEqual({ passive: true });
    scope.stop();
  });

  it('removes the listener when the scope is disposed', () => {
    const win = makeWindow(['en']);
    const scope = effectScope();
    scope.run(() => {
      usePreferredLanguages({ window: win as unknown as Window });
    });

    expect(win.listenerCount()).toBe(1);
    scope.stop();
    expect(win.listenerCount()).toBe(0);
  });

  it('falls back to ["en"] when no window is available (SSR)', async () => {
    // `defaultWindow` is import-time captured, so override it via a module mock
    // to simulate a server environment where no window exists.
    vi.resetModules();
    vi.doMock('@/types', async () => {
      const actual = await vi.importActual<typeof Types>('@/types');
      return { ...actual, defaultWindow: undefined };
    });

    const { usePreferredLanguages: ssrUsePreferredLanguages } = await import('.');

    const scope = effectScope();
    let langs: ReturnType<typeof ssrUsePreferredLanguages>;
    scope.run(() => {
      langs = ssrUsePreferredLanguages();
    });

    expect(langs!.value).toEqual(['en']);
    scope.stop();

    vi.doUnmock('@/types');
    vi.resetModules();
  });
});
