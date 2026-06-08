import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useMutationObserver } from '.';

let instances: Array<{ cb: MutationCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; takeRecords: ReturnType<typeof vi.fn> }> = [];

class StubMutationObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  cb: MutationCallback;
  constructor(cb: MutationCallback) {
    this.cb = cb;
    instances.push(this);
  }
}

describe(useMutationObserver, () => {
  beforeEach(() => {
    instances = [];
    vi.stubGlobal('MutationObserver', StubMutationObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('observes the target with the given options', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useMutationObserver(ref(el), vi.fn(), { attributes: true }));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(el, { attributes: true });
    scope.stop();
  });

  it('does not leak immediate/window into observer options', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useMutationObserver(ref(el), vi.fn(), { childList: true, immediate: true }));

    expect(instances[0]!.observe).toHaveBeenCalledWith(el, { childList: true });
    scope.stop();
  });

  it('disconnects on stop', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let stop: () => void;
    scope.run(() => {
      stop = useMutationObserver(ref(el), vi.fn()).stop;
    });

    stop!();
    expect(instances[0]!.disconnect).toHaveBeenCalled();
    scope.stop();
  });

  it('forwards records to the callback', () => {
    const el = document.createElement('div');
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => useMutationObserver(ref(el), callback));

    const records = [{ type: 'attributes' } as MutationRecord];
    instances[0]!.cb(records, instances[0] as unknown as MutationObserver);
    expect(callback).toHaveBeenCalledWith(records, expect.anything());
    scope.stop();
  });

  it('observes an array of targets with a single observer', () => {
    const a = document.createElement('div');
    const b = document.createElement('span');
    const scope = effectScope();
    scope.run(() => useMutationObserver([ref(a), b], vi.fn(), { childList: true }));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledTimes(2);
    expect(instances[0]!.observe).toHaveBeenCalledWith(a, { childList: true });
    expect(instances[0]!.observe).toHaveBeenCalledWith(b, { childList: true });
    scope.stop();
  });

  it('accepts a getter returning an array of targets', () => {
    const a = document.createElement('div');
    const b = document.createElement('span');
    const scope = effectScope();
    scope.run(() => useMutationObserver(() => [a, b], vi.fn(), { childList: true }));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledTimes(2);
    scope.stop();
  });

  it('deduplicates repeated targets', () => {
    const a = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useMutationObserver([a, a, ref(a)], vi.fn(), { childList: true }));

    expect(instances[0]!.observe).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('skips nullish targets', () => {
    const scope = effectScope();
    scope.run(() => useMutationObserver([ref(null), ref(undefined)], vi.fn(), { childList: true }));

    expect(instances).toHaveLength(0);
    scope.stop();
  });

  it('re-observes when a reactive target changes', async () => {
    const el = document.createElement('div');
    const target = ref<HTMLElement | null>(null);
    const scope = effectScope();
    scope.run(() => useMutationObserver(target, vi.fn(), { childList: true }));

    await nextTick();
    expect(instances).toHaveLength(0);

    target.value = el;
    await nextTick();
    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(el, { childList: true });
    scope.stop();
  });

  it('does not observe when immediate is false, then resumes', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let api: ReturnType<typeof useMutationObserver>;
    scope.run(() => {
      api = useMutationObserver(ref(el), vi.fn(), { attributes: true, immediate: false });
    });

    await nextTick();
    expect(instances).toHaveLength(0);
    expect(api!.isActive.value).toBeFalsy();

    api!.resume();
    await nextTick();
    expect(instances).toHaveLength(1);
    expect(api!.isActive.value).toBeTruthy();
    scope.stop();
  });

  it('pause disconnects and flips isActive, resume re-observes', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let api: ReturnType<typeof useMutationObserver>;
    scope.run(() => {
      api = useMutationObserver(ref(el), vi.fn(), { attributes: true });
    });

    expect(instances).toHaveLength(1);

    api!.pause();
    expect(instances[0]!.disconnect).toHaveBeenCalled();
    expect(api!.isActive.value).toBeFalsy();

    api!.resume();
    await nextTick();
    expect(instances).toHaveLength(2);
    scope.stop();
  });

  it('takeRecords proxies to the active observer and returns undefined when inactive', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let api: ReturnType<typeof useMutationObserver>;
    scope.run(() => {
      api = useMutationObserver(ref(el), vi.fn());
    });

    expect(api!.takeRecords()).toEqual([]);
    expect(instances[0]!.takeRecords).toHaveBeenCalled();

    api!.stop();
    expect(api!.takeRecords()).toBeUndefined();
    scope.stop();
  });

  it('reports isSupported false when MutationObserver is missing', () => {
    const scope = effectScope();
    let api: ReturnType<typeof useMutationObserver>;
    const el = document.createElement('div');
    scope.run(() => {
      api = useMutationObserver(ref(el), vi.fn(), { window: { foo: 1 } as unknown as Window & typeof globalThis });
    });

    expect(api!.isSupported.value).toBeFalsy();
    expect(instances).toHaveLength(0);
    scope.stop();
  });
});
