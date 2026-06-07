import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, effectScope, isReadonly, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useMediaQuery } from '.';

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

function stubMatchMedia(initialMatches: boolean) {
  const mql = makeMql(initialMatches);
  vi.stubGlobal('matchMedia', vi.fn(() => mql));
  return mql;
}

/** Returns a different MediaQueryList per query string, so reactive query swaps can be exercised. */
function stubMatchMediaByQuery(map: Record<string, StubMql>, fallbackMatches = false) {
  const spy = vi.fn((query: string) => map[query] ?? makeMql(fallbackMatches, query));
  vi.stubGlobal('matchMedia', spy);
  return spy;
}

describe(useMediaQuery, () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reflects the initial match', async () => {
    stubMatchMedia(true);
    const scope = effectScope();
    let matches: ReturnType<typeof useMediaQuery>;
    scope.run(() => {
      matches = useMediaQuery('(min-width: 100px)');
    });
    await nextTick();
    expect(matches!.value).toBeTruthy();
    scope.stop();
  });

  it('updates when the media query changes', async () => {
    const mql = stubMatchMedia(false);
    const scope = effectScope();
    let matches: ReturnType<typeof useMediaQuery>;
    scope.run(() => {
      matches = useMediaQuery('(min-width: 100px)');
    });
    await nextTick();

    expect(matches!.value).toBeFalsy();
    mql.dispatch(true);
    expect(matches!.value).toBeTruthy();
    scope.stop();
  });

  it('returns false when matchMedia is unsupported (SSR)', async () => {
    const scope = effectScope();
    let matches: ReturnType<typeof useMediaQuery>;
    scope.run(() => {
      matches = useMediaQuery('(min-width: 100px)');
    });
    await nextTick();
    expect(matches!.value).toBeFalsy();
    scope.stop();
  });

  it('returns a readonly ref', async () => {
    stubMatchMedia(true);
    const scope = effectScope();
    let matches: ReturnType<typeof useMediaQuery>;
    scope.run(() => {
      matches = useMediaQuery('(min-width: 100px)');
    });
    await nextTick();
    expect(isReadonly(matches!)).toBeTruthy();
    scope.stop();
  });

  it('reacts to a changing query ref by re-binding to the new MediaQueryList', async () => {
    const small = makeMql(false, '(min-width: 100px)');
    const large = makeMql(true, '(min-width: 1000px)');
    stubMatchMediaByQuery({
      '(min-width: 100px)': small,
      '(min-width: 1000px)': large,
    });

    const scope = effectScope();
    const query = ref('(min-width: 100px)');
    let matches: ReturnType<typeof useMediaQuery>;
    scope.run(() => {
      matches = useMediaQuery(query);
    });
    await nextTick();
    expect(matches!.value).toBeFalsy();

    query.value = '(min-width: 1000px)';
    await nextTick();
    expect(matches!.value).toBeTruthy();

    // The listener should follow the new MediaQueryList, not the old one.
    large.dispatch(false);
    expect(matches!.value).toBeFalsy();
    // The old MediaQueryList should no longer affect the result.
    small.dispatch(true);
    expect(matches!.value).toBeFalsy();

    scope.stop();
  });

  it('also accepts a getter for the query', async () => {
    stubMatchMedia(true);
    const scope = effectScope();
    let matches: ReturnType<typeof useMediaQuery>;
    scope.run(() => {
      matches = useMediaQuery(() => '(min-width: 100px)');
    });
    await nextTick();
    expect(matches!.value).toBeTruthy();
    scope.stop();
  });

  describe('ssrWidth', () => {
    it('resolves min-width against ssrWidth when matchMedia is unsupported', async () => {
      const scope = effectScope();
      let wide: ReturnType<typeof useMediaQuery>;
      let narrow: ReturnType<typeof useMediaQuery>;
      scope.run(() => {
        wide = useMediaQuery('(min-width: 1024px)', { ssrWidth: 1280 });
        narrow = useMediaQuery('(min-width: 1024px)', { ssrWidth: 800 });
      });
      await nextTick();
      expect(wide!.value).toBeTruthy();
      expect(narrow!.value).toBeFalsy();
      scope.stop();
    });

    it('resolves max-width against ssrWidth', async () => {
      const scope = effectScope();
      let matches: ReturnType<typeof useMediaQuery>;
      scope.run(() => {
        matches = useMediaQuery('(max-width: 768px)', { ssrWidth: 500 });
      });
      await nextTick();
      expect(matches!.value).toBeTruthy();
      scope.stop();
    });

    it('handles a min-width/max-width range', async () => {
      const scope = effectScope();
      let inRange: ReturnType<typeof useMediaQuery>;
      let outOfRange: ReturnType<typeof useMediaQuery>;
      scope.run(() => {
        inRange = useMediaQuery('(min-width: 600px) and (max-width: 1200px)', { ssrWidth: 900 });
        outOfRange = useMediaQuery('(min-width: 600px) and (max-width: 1200px)', { ssrWidth: 1500 });
      });
      await nextTick();
      expect(inRange!.value).toBeTruthy();
      expect(outOfRange!.value).toBeFalsy();
      scope.stop();
    });

    it('respects `not all` negation', async () => {
      const scope = effectScope();
      let matches: ReturnType<typeof useMediaQuery>;
      scope.run(() => {
        matches = useMediaQuery('not all and (min-width: 1024px)', { ssrWidth: 1280 });
      });
      await nextTick();
      expect(matches!.value).toBeFalsy();
      scope.stop();
    });

    it('OR-combines comma-separated queries', async () => {
      const scope = effectScope();
      let matches: ReturnType<typeof useMediaQuery>;
      scope.run(() => {
        matches = useMediaQuery('(min-width: 2000px), (max-width: 900px)', { ssrWidth: 800 });
      });
      await nextTick();
      expect(matches!.value).toBeTruthy();
      scope.stop();
    });

    it('converts em/rem units using a 16px root', async () => {
      const scope = effectScope();
      let matches: ReturnType<typeof useMediaQuery>;
      // 48em === 768px; ssrWidth 800 >= 768 → matches
      scope.run(() => {
        matches = useMediaQuery('(min-width: 48em)', { ssrWidth: 800 });
      });
      await nextTick();
      expect(matches!.value).toBeTruthy();
      scope.stop();
    });

    it('prefers the real matchMedia over ssrWidth once mounted', async () => {
      // matchMedia reports false even though ssrWidth would resolve true.
      stubMatchMedia(false);
      let matches: ReturnType<typeof useMediaQuery>;
      const wrapper = mount(defineComponent({
        setup() {
          matches = useMediaQuery('(min-width: 1024px)', { ssrWidth: 1280 });
          return () => null;
        },
      }));
      await nextTick();
      // After mount, isSupported becomes true and the real (false) result wins.
      expect(matches!.value).toBeFalsy();
      wrapper.unmount();
    });

    it('uses ssrWidth on the first render before mount, then re-evaluates', async () => {
      // Real matchMedia is available, but the very first synchronous effect
      // run (pre-mount) should still resolve via ssrWidth to avoid flicker.
      stubMatchMedia(false);
      let matches: ReturnType<typeof useMediaQuery>;
      const scope = effectScope();
      // Without a mounted component, isSupported stays false, so ssrWidth wins.
      scope.run(() => {
        matches = useMediaQuery('(min-width: 1024px)', { ssrWidth: 1280 });
      });
      await nextTick();
      expect(matches!.value).toBeTruthy();
      scope.stop();
    });
  });
});
