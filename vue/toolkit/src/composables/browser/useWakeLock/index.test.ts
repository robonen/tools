import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useWakeLock } from '.';
import type { WakeLockSentinel, WakeLockType } from '.';

afterEach(() => {
  vi.unstubAllGlobals();
});

interface FakeSentinel extends WakeLockSentinel {
  dispatchRelease: () => void;
}

function createFakeSentinel(type: WakeLockType): FakeSentinel {
  const target = new EventTarget();
  const sentinel = target as unknown as FakeSentinel;
  sentinel.type = type;
  sentinel.released = false;
  sentinel.release = vi.fn(async () => {
    sentinel.released = true;
  });
  sentinel.dispatchRelease = () => {
    sentinel.released = true;
    target.dispatchEvent(new Event('release'));
  };
  return sentinel;
}

interface FakeEnv {
  navigator: Navigator;
  request: ReturnType<typeof vi.fn>;
  sentinels: FakeSentinel[];
}

function createFakeNavigator(): FakeEnv {
  const sentinels: FakeSentinel[] = [];
  const request = vi.fn(async (type: WakeLockType) => {
    const sentinel = createFakeSentinel(type);
    sentinels.push(sentinel);
    return sentinel;
  });
  const navigator = { wakeLock: { request } } as unknown as Navigator;
  return { navigator, request, sentinels };
}

function createFakeDocument(state: DocumentVisibilityState = 'visible') {
  const target = new EventTarget();
  const doc = {
    visibilityState: state,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  } as unknown as Document & { visibilityState: DocumentVisibilityState };
  const setVisibility = (next: DocumentVisibilityState) => {
    doc.visibilityState = next;
    target.dispatchEvent(new Event('visibilitychange'));
  };
  return { document: doc, setVisibility };
}

describe(useWakeLock, () => {
  it('reports supported when navigator.wakeLock exists', () => {
    const { navigator } = createFakeNavigator();
    const scope = effectScope();
    let api: ReturnType<typeof useWakeLock>;
    scope.run(() => {
      api = useWakeLock({ navigator });
    });

    expect(api!.isSupported.value).toBeTruthy();
    expect(api!.isActive.value).toBeFalsy();
    expect(api!.sentinel.value).toBeNull();
    scope.stop();
  });

  it('reports unsupported when wakeLock is missing', () => {
    const navigator = {} as Navigator;
    const scope = effectScope();
    let api: ReturnType<typeof useWakeLock>;
    scope.run(() => {
      api = useWakeLock({ navigator });
    });

    expect(api!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('requests a wake lock and becomes active', async () => {
    const { navigator, request } = createFakeNavigator();
    const { document } = createFakeDocument('visible');
    const scope = effectScope();
    let api: ReturnType<typeof useWakeLock>;
    scope.run(() => {
      api = useWakeLock({ navigator, document });
    });

    await api!.request('screen');

    expect(request).toHaveBeenCalledWith('screen');
    expect(api!.sentinel.value).not.toBeNull();
    expect(api!.isActive.value).toBeTruthy();
    scope.stop();
  });

  it('releases the wake lock and clears the sentinel', async () => {
    const { navigator, sentinels } = createFakeNavigator();
    const { document } = createFakeDocument('visible');
    const scope = effectScope();
    let api: ReturnType<typeof useWakeLock>;
    scope.run(() => {
      api = useWakeLock({ navigator, document });
    });

    await api!.request('screen');
    await api!.release();

    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1);
    expect(api!.sentinel.value).toBeNull();
    expect(api!.isActive.value).toBeFalsy();
    scope.stop();
  });

  it('forceRequest releases the previous lock before acquiring a new one', async () => {
    const { navigator, sentinels, request } = createFakeNavigator();
    const { document } = createFakeDocument('visible');
    const scope = effectScope();
    let api: ReturnType<typeof useWakeLock>;
    scope.run(() => {
      api = useWakeLock({ navigator, document });
    });

    await api!.forceRequest('screen');
    await api!.forceRequest('screen');

    expect(request).toHaveBeenCalledTimes(2);
    expect(sentinels[0]!.release).toHaveBeenCalledTimes(1);
    expect(api!.sentinel.value).toBe(sentinels[1]);
    scope.stop();
  });

  it('defers the request while hidden and re-acquires on visible', async () => {
    const { navigator, request } = createFakeNavigator();
    const { document, setVisibility } = createFakeDocument('hidden');
    const scope = effectScope();
    let api: ReturnType<typeof useWakeLock>;
    scope.run(() => {
      api = useWakeLock({ navigator, document });
    });

    await api!.request('screen');

    // Hidden: nothing acquired yet
    expect(request).not.toHaveBeenCalled();
    expect(api!.sentinel.value).toBeNull();

    setVisibility('visible');
    await nextTick();
    await nextTick();

    expect(request).toHaveBeenCalledWith('screen');
    expect(api!.sentinel.value).not.toBeNull();
    expect(api!.isActive.value).toBeTruthy();
    scope.stop();
  });

  it('re-acquires after the browser releases the lock on the next visible transition', async () => {
    const { navigator, sentinels, request } = createFakeNavigator();
    const { document, setVisibility } = createFakeDocument('visible');
    const scope = effectScope();
    let api: ReturnType<typeof useWakeLock>;
    scope.run(() => {
      api = useWakeLock({ navigator, document });
    });

    await api!.request('screen');
    expect(request).toHaveBeenCalledTimes(1);

    // Browser auto-releases the sentinel (e.g. the tab was hidden)
    setVisibility('hidden');
    await nextTick();
    sentinels[0]!.dispatchRelease();
    await nextTick();

    // Becoming visible again should re-acquire
    setVisibility('visible');
    await nextTick();
    await nextTick();

    expect(request).toHaveBeenCalledTimes(2);
    scope.stop();
  });

  it('is SSR-safe with no navigator/document', async () => {
    const scope = effectScope();
    let api: ReturnType<typeof useWakeLock>;
    scope.run(() => {
      api = useWakeLock({ navigator: undefined, document: undefined });
    });

    expect(api!.isSupported.value).toBeFalsy();

    // Should not throw on the unsupported path
    await api!.request('screen');
    expect(api!.sentinel.value).toBeNull();
    expect(api!.isActive.value).toBeFalsy();
    await api!.release();
    scope.stop();
  });

  it('releases on scope dispose', async () => {
    const { navigator, sentinels } = createFakeNavigator();
    const { document } = createFakeDocument('visible');
    const scope = effectScope();
    let api: ReturnType<typeof useWakeLock>;
    scope.run(() => {
      api = useWakeLock({ navigator, document });
    });

    await api!.request('screen');
    scope.stop();
    await nextTick();

    expect(sentinels[0]!.release).toHaveBeenCalled();
  });
});
