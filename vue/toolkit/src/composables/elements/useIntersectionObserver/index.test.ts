import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useIntersectionObserver } from '.';

interface StubInstance {
  cb: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

let instances: StubInstance[] = [];

class StubIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn();
  cb: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.cb = cb;
    this.options = options;
    instances.push(this);
  }
}

describe(useIntersectionObserver, () => {
  beforeEach(() => {
    instances = [];
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('observes the target immediately', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useIntersectionObserver(ref(el), vi.fn()));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(el);
    scope.stop();
  });

  it('does not observe when immediate is false', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useIntersectionObserver(ref(el), vi.fn(), { immediate: false }));

    expect(instances).toHaveLength(0);
    scope.stop();
  });

  it('pause disconnects and resume re-observes', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let controls: ReturnType<typeof useIntersectionObserver>;
    scope.run(() => {
      controls = useIntersectionObserver(ref(el), vi.fn());
    });

    controls!.pause();
    expect(instances[0]!.disconnect).toHaveBeenCalled();
    expect(controls!.isActive.value).toBeFalsy();

    controls!.resume();
    await nextTick();
    expect(controls!.isActive.value).toBeTruthy();
    expect(instances).toHaveLength(2);
    scope.stop();
  });

  it('stop disconnects and marks inactive', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let controls: ReturnType<typeof useIntersectionObserver>;
    scope.run(() => {
      controls = useIntersectionObserver(ref(el), vi.fn());
    });

    controls!.stop();
    expect(instances[0]!.disconnect).toHaveBeenCalled();
    expect(controls!.isActive.value).toBeFalsy();
    scope.stop();
  });

  it('invokes the callback with entries', () => {
    const el = document.createElement('div');
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => useIntersectionObserver(ref(el), callback));

    const entry = { isIntersecting: true, time: 1 } as IntersectionObserverEntry;
    instances[0]!.cb([entry], instances[0] as unknown as IntersectionObserver);
    expect(callback).toHaveBeenCalled();
    scope.stop();
  });

  it('observes an array of targets', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useIntersectionObserver([ref(a), ref(b)], vi.fn()));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(a);
    expect(instances[0]!.observe).toHaveBeenCalledWith(b);
    scope.stop();
  });

  it('tracks a reactive target ref of an array', async () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const list = ref([a]);
    const scope = effectScope();
    scope.run(() => useIntersectionObserver(list, vi.fn()));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledTimes(1);

    list.value = [a, b];
    await nextTick();

    // recreated with both elements
    expect(instances).toHaveLength(2);
    expect(instances[1]!.observe).toHaveBeenCalledWith(a);
    expect(instances[1]!.observe).toHaveBeenCalledWith(b);
    scope.stop();
  });

  it('tracks a getter target', async () => {
    const a = document.createElement('div');
    const enabled = ref(false);
    const scope = effectScope();
    scope.run(() => useIntersectionObserver(() => (enabled.value ? a : null), vi.fn()));

    // null target -> no observer
    expect(instances).toHaveLength(0);

    enabled.value = true;
    await nextTick();
    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(a);
    scope.stop();
  });

  it('passes rootMargin and threshold to the observer', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useIntersectionObserver(ref(el), vi.fn(), { rootMargin: '10px', threshold: [0, 0.5, 1] }));

    expect(instances[0]!.options?.rootMargin).toBe('10px');
    expect(instances[0]!.options?.threshold).toEqual([0, 0.5, 1]);
    scope.stop();
  });

  it('reacts to a reactive rootMargin', async () => {
    const el = document.createElement('div');
    const rootMargin = ref('0px');
    const scope = effectScope();
    scope.run(() => useIntersectionObserver(ref(el), vi.fn(), { rootMargin }));

    expect(instances[0]!.options?.rootMargin).toBe('0px');

    rootMargin.value = '20px';
    await nextTick();

    expect(instances).toHaveLength(2);
    expect(instances[1]!.options?.rootMargin).toBe('20px');
    scope.stop();
  });

  it('reacts to a reactive threshold', async () => {
    const el = document.createElement('div');
    const threshold = ref<number | number[]>(0);
    const scope = effectScope();
    scope.run(() => useIntersectionObserver(ref(el), vi.fn(), { threshold }));

    expect(instances[0]!.options?.threshold).toBe(0);

    threshold.value = 0.75;
    await nextTick();

    expect(instances).toHaveLength(2);
    expect(instances[1]!.options?.threshold).toBe(0.75);
    scope.stop();
  });

  it('reports unsupported and never constructs an observer', () => {
    // jsdom has no native IntersectionObserver; remove the stub so the
    // feature detection `'IntersectionObserver' in window` reports false.
    vi.unstubAllGlobals();
    delete (globalThis as Record<string, unknown>).IntersectionObserver;
    const el = document.createElement('div');
    const scope = effectScope();
    let controls: ReturnType<typeof useIntersectionObserver>;
    scope.run(() => {
      controls = useIntersectionObserver(ref(el), vi.fn());
    });

    expect(controls!.isSupported.value).toBeFalsy();
    // stop should be a safe no-op
    expect(() => controls!.stop()).not.toThrow();
    scope.stop();
  });
});
