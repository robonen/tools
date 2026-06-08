import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useResizeObserver } from '.';

let instances: Array<{ cb: ResizeObserverCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];

class StubResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    instances.push(this);
  }
}

describe(useResizeObserver, () => {
  beforeEach(() => {
    instances = [];
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('observes the target element', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useResizeObserver(ref(el), vi.fn()));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(el, undefined);
    scope.stop();
  });

  it('passes the box option through to observe', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useResizeObserver(ref(el), vi.fn(), { box: 'border-box' }));

    expect(instances[0]!.observe).toHaveBeenCalledWith(el, { box: 'border-box' });
    scope.stop();
  });

  it('observes an array of targets with a single observer', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useResizeObserver([ref(a), ref(b)], vi.fn()));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(a, undefined);
    expect(instances[0]!.observe).toHaveBeenCalledWith(b, undefined);
    scope.stop();
  });

  it('supports a getter target', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useResizeObserver(() => el, vi.fn()));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(el, undefined);
    scope.stop();
  });

  it('disconnects on stop', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let stop: () => void;
    scope.run(() => {
      stop = useResizeObserver(ref(el), vi.fn()).stop;
    });

    stop!();
    expect(instances[0]!.disconnect).toHaveBeenCalled();
    scope.stop();
  });

  it('invokes the callback with entries', () => {
    const el = document.createElement('div');
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => useResizeObserver(ref(el), callback));

    const entry = { contentRect: { width: 10, height: 20 } } as ResizeObserverEntry;
    instances[0]!.cb([entry], instances[0] as unknown as ResizeObserver);
    expect(callback).toHaveBeenCalledWith([entry], expect.anything());
    scope.stop();
  });

  it('re-observes when the target ref changes', async () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const target = ref<HTMLElement>(a);
    const scope = effectScope();
    scope.run(() => useResizeObserver(target, vi.fn()));

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(a, undefined);

    target.value = b;
    await nextTick();

    expect(instances[0]!.disconnect).toHaveBeenCalled();
    expect(instances).toHaveLength(2);
    expect(instances[1]!.observe).toHaveBeenCalledWith(b, undefined);
    scope.stop();
  });

  it('does not create an observer for a null target', () => {
    const target = ref<HTMLElement | null>(null);
    const scope = effectScope();
    scope.run(() => useResizeObserver(target, vi.fn()));

    expect(instances).toHaveLength(0);
    scope.stop();
  });

  it('starts observing when a null target is later assigned', async () => {
    const el = document.createElement('div');
    const target = ref<HTMLElement | null>(null);
    const scope = effectScope();
    scope.run(() => useResizeObserver(target, vi.fn()));

    expect(instances).toHaveLength(0);

    target.value = el;
    await nextTick();

    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(el, undefined);
    scope.stop();
  });

  it('does not observe when immediate is false until resumed', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let controls!: ReturnType<typeof useResizeObserver>;
    scope.run(() => {
      controls = useResizeObserver(ref(el), vi.fn(), { immediate: false });
    });

    expect(controls.isActive.value).toBeFalsy();
    expect(instances).toHaveLength(0);

    controls.resume();
    await nextTick();

    expect(controls.isActive.value).toBeTruthy();
    expect(instances).toHaveLength(1);
    expect(instances[0]!.observe).toHaveBeenCalledWith(el, undefined);
    scope.stop();
  });

  it('pause disconnects and flips isActive, resume re-observes', async () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let controls!: ReturnType<typeof useResizeObserver>;
    scope.run(() => {
      controls = useResizeObserver(ref(el), vi.fn());
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
    expect(instances[1]!.observe).toHaveBeenCalledWith(el, undefined);
    scope.stop();
  });

  it('cleans up when the scope is disposed', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    scope.run(() => useResizeObserver(ref(el), vi.fn()));

    expect(instances).toHaveLength(1);
    scope.stop();
    expect(instances[0]!.disconnect).toHaveBeenCalled();
  });
});
