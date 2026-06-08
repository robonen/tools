import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, nextTick } from 'vue';
import { useDevicePixelRatio } from '.';

type Listener = (event: { matches: boolean }) => void;

interface StubMql {
  readonly matches: boolean;
  media: string;
  addEventListener: (type: string, cb: Listener) => void;
  removeEventListener: (type: string, cb: Listener) => void;
  dispatch: (value: boolean) => void;
}

function makeMql(media = ''): StubMql {
  const listeners = new Set<Listener>();
  let matches = true;

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

/** Returns one MediaQueryList per query string so re-binding can be exercised. */
function stubMatchMediaByQuery() {
  const map = new Map<string, StubMql>();
  const spy = vi.fn((query: string) => {
    if (!map.has(query))
      map.set(query, makeMql(query));
    return map.get(query)!;
  });
  vi.stubGlobal('matchMedia', spy);
  return { spy, map };
}

/** A minimal window stub whose `devicePixelRatio` can be mutated in tests. */
function makeWindowStub(initialRatio: number): Window & { devicePixelRatio: number } {
  return {
    devicePixelRatio: initialRatio,
    matchMedia: globalThis.matchMedia,
  } as unknown as Window & { devicePixelRatio: number };
}

describe(useDevicePixelRatio, () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reflects the initial devicePixelRatio', async () => {
    stubMatchMediaByQuery();
    const window = makeWindowStub(2);
    const scope = effectScope();
    let result: ReturnType<typeof useDevicePixelRatio>;
    scope.run(() => {
      result = useDevicePixelRatio({ window });
    });
    await nextTick();
    expect(result!.pixelRatio.value).toBe(2);
    scope.stop();
  });

  it('returns a readonly ref', async () => {
    stubMatchMediaByQuery();
    const window = makeWindowStub(1);
    const scope = effectScope();
    let result: ReturnType<typeof useDevicePixelRatio>;
    scope.run(() => {
      result = useDevicePixelRatio({ window });
    });
    await nextTick();
    expect(isReadonly(result!.pixelRatio)).toBeTruthy();
    scope.stop();
  });

  it('updates when the resolution media query flips', async () => {
    const { map } = stubMatchMediaByQuery();
    const window = makeWindowStub(1);
    const scope = effectScope();
    let result: ReturnType<typeof useDevicePixelRatio>;
    scope.run(() => {
      result = useDevicePixelRatio({ window });
    });
    await nextTick();
    expect(result!.pixelRatio.value).toBe(1);

    // Simulate a zoom: the real ratio changes, then the current query flips.
    window.devicePixelRatio = 2;
    map.get('(resolution: 1dppx)')!.dispatch(false);
    await nextTick();
    expect(result!.pixelRatio.value).toBe(2);

    scope.stop();
  });

  it('re-binds the listener after the ratio changes', async () => {
    const { spy, map } = stubMatchMediaByQuery();
    const window = makeWindowStub(1);
    const scope = effectScope();
    let result: ReturnType<typeof useDevicePixelRatio>;
    scope.run(() => {
      result = useDevicePixelRatio({ window });
    });
    await nextTick();

    window.devicePixelRatio = 3;
    map.get('(resolution: 1dppx)')!.dispatch(false);
    await nextTick();
    expect(result!.pixelRatio.value).toBe(3);

    // The query string should now track 3dppx (new MediaQueryList created).
    expect(spy).toHaveBeenCalledWith('(resolution: 3dppx)');

    // Further changes are driven by the new MediaQueryList.
    window.devicePixelRatio = 1.5;
    map.get('(resolution: 3dppx)')!.dispatch(false);
    await nextTick();
    expect(result!.pixelRatio.value).toBe(1.5);

    scope.stop();
  });

  it('stops tracking after stop()', async () => {
    const { map } = stubMatchMediaByQuery();
    const window = makeWindowStub(1);
    const scope = effectScope();
    let result: ReturnType<typeof useDevicePixelRatio>;
    scope.run(() => {
      result = useDevicePixelRatio({ window });
    });
    await nextTick();

    result!.stop();

    window.devicePixelRatio = 2;
    map.get('(resolution: 1dppx)')!.dispatch(false);
    await nextTick();
    expect(result!.pixelRatio.value).toBe(1);

    scope.stop();
  });

  it('defaults to 1 with a no-op stop when no window is available (SSR)', async () => {
    const scope = effectScope();
    let result: ReturnType<typeof useDevicePixelRatio>;
    scope.run(() => {
      result = useDevicePixelRatio({ window: undefined });
    });
    await nextTick();
    expect(result!.pixelRatio.value).toBe(1);
    // stop() must be safe to call even when nothing was bound.
    expect(() => result!.stop()).not.toThrow();
    scope.stop();
  });
});
