import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { usePerformanceObserver } from '.';

interface StubInstance {
  cb: PerformanceObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  takeRecords: ReturnType<typeof vi.fn>;
}

let instances: StubInstance[] = [];

class StubPerformanceObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => [] as PerformanceEntryList);
  cb: PerformanceObserverCallback;
  constructor(cb: PerformanceObserverCallback) {
    this.cb = cb;
    instances.push(this as unknown as StubInstance);
  }
}

describe(usePerformanceObserver, () => {
  beforeEach(() => {
    instances = [];
    vi.stubGlobal('PerformanceObserver', StubPerformanceObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reports support when PerformanceObserver exists', () => {
    const scope = effectScope();
    let controls!: ReturnType<typeof usePerformanceObserver>;
    scope.run(() => {
      controls = usePerformanceObserver(vi.fn());
    });

    expect(controls.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('creates an observer and calls observe with the init options', () => {
    const scope = effectScope();
    scope.run(() => usePerformanceObserver(vi.fn(), { entryTypes: ['paint', 'measure'] }));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith({ entryTypes: ['paint', 'measure'] });
    scope.stop();
  });

  it('passes a single type with buffered option through to observe', () => {
    const scope = effectScope();
    scope.run(() => usePerformanceObserver(vi.fn(), { type: 'longtask', buffered: true }));

    expect(instances[0]!.observe).toHaveBeenCalledWith({ type: 'longtask', buffered: true });
    scope.stop();
  });

  it('invokes the callback with the entry list and observer', () => {
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => usePerformanceObserver(callback, { entryTypes: ['paint'] }));

    const list = { getEntries: () => [] } as unknown as PerformanceObserverEntryList;
    instances[0]!.cb(list, instances[0] as unknown as PerformanceObserver);
    expect(callback).toHaveBeenCalledWith(list, expect.anything());
    scope.stop();
  });

  it('disconnects on stop', () => {
    const scope = effectScope();
    let stop!: () => void;
    scope.run(() => {
      stop = usePerformanceObserver(vi.fn()).stop;
    });

    stop();
    expect(instances[0]!.disconnect).toHaveBeenCalled();
    scope.stop();
  });

  it('does not observe when immediate is false until resumed', async () => {
    const scope = effectScope();
    let controls!: ReturnType<typeof usePerformanceObserver>;
    scope.run(() => {
      controls = usePerformanceObserver(vi.fn(), { immediate: false, entryTypes: ['paint'] });
    });

    expect(controls.isActive.value).toBeFalsy();
    expect(instances).toHaveLength(0);

    controls.resume();
    await nextTick();

    expect(controls.isActive.value).toBeTruthy();
    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith({ entryTypes: ['paint'] });
    scope.stop();
  });

  it('pause disconnects and flips isActive, resume re-observes', async () => {
    const scope = effectScope();
    let controls!: ReturnType<typeof usePerformanceObserver>;
    scope.run(() => {
      controls = usePerformanceObserver(vi.fn(), { entryTypes: ['paint'] });
    });

    expect(controls.isActive.value).toBeTruthy();
    expect(instances).toHaveLength(1);

    controls.pause();
    expect(controls.isActive.value).toBeFalsy();
    expect(instances[0]!.disconnect).toHaveBeenCalled();

    controls.resume();
    await nextTick();

    expect(controls.isActive.value).toBeTruthy();
    expect(instances).toHaveLength(2);
    expect(instances[1]!.observe).toHaveBeenCalledWith({ entryTypes: ['paint'] });
    scope.stop();
  });

  it('takeRecords delegates to the active observer', () => {
    const records = [{ name: 'x' }] as unknown as PerformanceEntryList;
    const scope = effectScope();
    let controls!: ReturnType<typeof usePerformanceObserver>;
    scope.run(() => {
      controls = usePerformanceObserver(vi.fn());
    });

    instances[0]!.takeRecords.mockReturnValue(records);
    expect(controls.takeRecords()).toBe(records);
    expect(instances[0]!.takeRecords).toHaveBeenCalled();
    scope.stop();
  });

  it('takeRecords returns undefined when no observer is active', () => {
    const scope = effectScope();
    let controls!: ReturnType<typeof usePerformanceObserver>;
    scope.run(() => {
      controls = usePerformanceObserver(vi.fn(), { immediate: false });
    });

    expect(controls.takeRecords()).toBeUndefined();
    scope.stop();
  });

  it('cleans up when the scope is disposed', () => {
    const scope = effectScope();
    scope.run(() => usePerformanceObserver(vi.fn()));

    expect(instances).toHaveLength(1);
    scope.stop();
    expect(instances[0]!.disconnect).toHaveBeenCalled();
  });

  it('does nothing in an unsupported / SSR-like environment', () => {
    // A window object without PerformanceObserver simulates both an
    // unsupported browser and an SSR shell (passed explicitly via options,
    // since defaultWindow is captured at import time).
    const fakeWindow = {} as Window & typeof globalThis;
    const scope = effectScope();
    let controls!: ReturnType<typeof usePerformanceObserver>;
    scope.run(() => {
      controls = usePerformanceObserver(vi.fn(), { window: fakeWindow, entryTypes: ['paint'] });
    });

    expect(controls.isSupported.value).toBeFalsy();
    expect(instances).toHaveLength(0);
    // Operations remain safe no-ops.
    expect(controls.takeRecords()).toBeUndefined();
    controls.resume();
    expect(instances).toHaveLength(0);
    scope.stop();
  });
});
