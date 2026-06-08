import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useInfiniteScroll } from '.';

interface ScrollMetrics {
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
}

function makeScrollable(overrides: Partial<ScrollMetrics> = {}) {
  const el = document.createElement('div');
  Object.defineProperties(el, {
    scrollWidth: { value: overrides.scrollWidth ?? 1000, configurable: true },
    scrollHeight: { value: overrides.scrollHeight ?? 1000, configurable: true },
    clientWidth: { value: overrides.clientWidth ?? 100, configurable: true },
    clientHeight: { value: overrides.clientHeight ?? 100, configurable: true },
  });
  el.scrollLeft = 0;
  el.scrollTop = 0;
  return el;
}

function withScope<T>(fn: () => T): { result: T; scope: ReturnType<typeof effectScope> } {
  const scope = effectScope();
  let result!: T;
  scope.run(() => {
    result = fn();
  });
  return { result, scope };
}

// Let queued promises (loader + delay Promise.all, its .finally, the nested
// nextTick re-check) and post-flush watchers fully settle.
async function settle() {
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
    await nextTick();
  }
}

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function defer(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe(useInfiniteScroll, () => {
  it('loads immediately when the container is not overflowing', async () => {
    // scrollHeight <= clientHeight -> no scroll event will ever fire, so it
    // should load eagerly on mount.
    const el = makeScrollable({ scrollHeight: 100, clientHeight: 100 });
    const onLoadMore = vi.fn();

    const { result, scope } = withScope(() =>
      useInfiniteScroll(ref(el), onLoadMore, { interval: 0 }));

    await settle();

    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(result.isLoading.value).toBeFalsy();
    scope.stop();
  });

  it('does not load when the bottom edge is far away', async () => {
    const el = makeScrollable();
    const onLoadMore = vi.fn();

    const { scope } = withScope(() =>
      useInfiniteScroll(ref(el), onLoadMore, { interval: 0 }));

    await settle();

    expect(onLoadMore).not.toHaveBeenCalled();
    scope.stop();
  });

  it('loads when scrolled within distance of the bottom edge', async () => {
    const el = makeScrollable();
    const onLoadMore = vi.fn();

    const { scope } = withScope(() =>
      useInfiniteScroll(ref(el), onLoadMore, { distance: 50, interval: 0 }));

    await settle();
    expect(onLoadMore).not.toHaveBeenCalled();

    // 860 + 100 client + 50 distance >= 1000 scrollHeight - threshold
    el.scrollTop = 860;
    el.dispatchEvent(new Event('scroll'));
    await settle();

    expect(onLoadMore).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('respects the horizontal "right" direction', async () => {
    const el = makeScrollable();
    const onLoadMore = vi.fn();

    const { scope } = withScope(() =>
      useInfiniteScroll(ref(el), onLoadMore, { direction: 'right', interval: 0 }));

    await settle();
    expect(onLoadMore).not.toHaveBeenCalled();

    el.scrollLeft = 900;
    el.dispatchEvent(new Event('scroll'));
    await settle();

    expect(onLoadMore).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('exposes isLoading while an async loader is in flight', async () => {
    const el = makeScrollable({ scrollHeight: 100, clientHeight: 100 });
    const gate = defer();
    const onLoadMore = vi.fn(() => gate.promise);

    const { result, scope } = withScope(() =>
      useInfiniteScroll(ref(el), onLoadMore, { interval: 0 }));

    await settle();
    expect(result.isLoading.value).toBeTruthy();

    gate.resolve();
    await settle();
    expect(result.isLoading.value).toBeFalsy();
    scope.stop();
  });

  it('does not start a second load while one is pending', async () => {
    const el = makeScrollable({ scrollHeight: 100, clientHeight: 100 });
    const gate = defer();
    const onLoadMore = vi.fn(() => gate.promise);

    const { scope } = withScope(() =>
      useInfiniteScroll(ref(el), onLoadMore, { interval: 0 }));

    await settle();
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // Trigger another check while the first load is still pending.
    el.dispatchEvent(new Event('scroll'));
    await settle();
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    gate.resolve();
    await settle();
    scope.stop();
  });

  it('stops loading when canLoadMore returns false', async () => {
    const el = makeScrollable({ scrollHeight: 100, clientHeight: 100 });
    const onLoadMore = vi.fn();

    const { scope } = withScope(() =>
      useInfiniteScroll(ref(el), onLoadMore, { interval: 0, canLoadMore: () => false }));

    await settle();

    expect(onLoadMore).not.toHaveBeenCalled();
    scope.stop();
  });

  it('reports loader errors via onError and keeps isLoading false afterwards', async () => {
    const el = makeScrollable({ scrollHeight: 100, clientHeight: 100 });
    const onError = vi.fn();
    const onLoadMore = vi.fn(() => Promise.reject(new Error('boom')));

    const { result, scope } = withScope(() =>
      useInfiniteScroll(ref(el), onLoadMore, { interval: 0, onError }));

    await settle();
    await settle();

    expect(onLoadMore).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result.isLoading.value).toBeFalsy();
    scope.stop();
  });

  it('reset() re-runs the edge check', async () => {
    const el = makeScrollable();
    const onLoadMore = vi.fn();

    const { result, scope } = withScope(() =>
      useInfiniteScroll(ref(el), onLoadMore, { interval: 0 }));

    await settle();
    expect(onLoadMore).not.toHaveBeenCalled();

    // Now make the container not overflow, then reset to pick it up.
    Object.defineProperty(el, 'scrollHeight', { value: 100, configurable: true });
    result.reset();
    await settle();

    expect(onLoadMore).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('does nothing in an SSR-like environment (window undefined)', async () => {
    const onLoadMore = vi.fn();

    const { result, scope } = withScope(() =>
      useInfiniteScroll(ref(null), onLoadMore, { window: undefined, interval: 0 }));

    await settle();

    expect(onLoadMore).not.toHaveBeenCalled();
    expect(result.isLoading.value).toBeFalsy();
    expect(typeof result.reset).toBe('function');
    scope.stop();
  });
});
