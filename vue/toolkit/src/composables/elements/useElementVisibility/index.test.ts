import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, ref } from 'vue';
import type { UseElementVisibilityReturn } from '.';
import { useElementVisibility } from '.';

let instances: StubIntersectionObserver[] = [];
let lastInit: IntersectionObserverInit | undefined;

class StubIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn();
  cb: IntersectionObserverCallback;
  init?: IntersectionObserverInit;
  constructor(cb: IntersectionObserverCallback, init?: IntersectionObserverInit) {
    this.cb = cb;
    this.init = init;
    lastInit = init;
    instances.push(this);
  }
}

describe(useElementVisibility, () => {
  beforeEach(() => {
    instances = [];
    lastInit = undefined;
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is false initially and updates on intersection', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isVisible: UseElementVisibilityReturn<false>;
    scope.run(() => {
      isVisible = useElementVisibility(ref(el));
    });

    expect(isVisible!.value).toBeFalsy();

    instances[0]!.cb([{ isIntersecting: true, time: 1 } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(isVisible!.value).toBeTruthy();

    instances[0]!.cb([{ isIntersecting: false, time: 2 } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(isVisible!.value).toBeFalsy();
    scope.stop();
  });

  it('uses the most recent entry by time', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isVisible: UseElementVisibilityReturn<false>;
    scope.run(() => {
      isVisible = useElementVisibility(ref(el));
    });

    instances[0]!.cb([
      { isIntersecting: false, time: 5 } as IntersectionObserverEntry,
      { isIntersecting: true, time: 10 } as IntersectionObserverEntry,
    ], {} as IntersectionObserver);
    expect(isVisible!.value).toBeTruthy();
    scope.stop();
  });

  it('respects initialValue', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isVisible: UseElementVisibilityReturn<false>;
    scope.run(() => {
      isVisible = useElementVisibility(ref(el), { initialValue: true });
    });

    expect(isVisible!.value).toBeTruthy();
    scope.stop();
  });

  it('returns a writable shallow ref (not readonly) by default', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isVisible: UseElementVisibilityReturn<false>;
    scope.run(() => {
      isVisible = useElementVisibility(ref(el));
    });

    expect(isReadonly(isVisible!)).toBeFalsy();
    scope.stop();
  });

  it('forwards rootMargin and threshold to the observer', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useElementVisibility(ref(el), { rootMargin: '10px', threshold: [0, 0.5, 1] }));

    expect(lastInit?.rootMargin).toBe('10px');
    expect(lastInit?.threshold).toEqual([0, 0.5, 1]);
    scope.stop();
  });

  it('stops observing after first visibility when once is true', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let isVisible: UseElementVisibilityReturn<false>;
    scope.run(() => {
      isVisible = useElementVisibility(ref(el), { once: true });
    });

    const observer = instances[0]!;

    // Not visible yet: should not disconnect.
    observer.cb([{ isIntersecting: false, time: 1 } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(observer.disconnect).not.toHaveBeenCalled();
    expect(isVisible!.value).toBeFalsy();

    // Becomes visible: stop() should disconnect the observer.
    observer.cb([{ isIntersecting: true, time: 2 } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(isVisible!.value).toBeTruthy();
    expect(observer.disconnect).toHaveBeenCalled();
    scope.stop();
  });

  it('exposes observer controls when controls is true', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let result: UseElementVisibilityReturn<true>;
    scope.run(() => {
      result = useElementVisibility(ref(el), { controls: true });
    });

    expect(result!).toHaveProperty('isVisible');
    expect(result!).toHaveProperty('stop');
    expect(result!).toHaveProperty('pause');
    expect(result!).toHaveProperty('resume');
    expect(result!).toHaveProperty('isSupported');
    expect(result!).toHaveProperty('isActive');

    expect(result!.isVisible.value).toBeFalsy();
    instances[0]!.cb([{ isIntersecting: true, time: 1 } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(result!.isVisible.value).toBeTruthy();

    result!.stop();
    expect(instances[0]!.disconnect).toHaveBeenCalled();
    scope.stop();
  });
});
