import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useElementSize } from '.';

interface StubInstance {
  cb: ResizeObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
}

let instances: StubInstance[] = [];

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

function fire(width: number, height: number, fields: Partial<ResizeObserverEntry> = {}) {
  instances[0]!.cb([
    {
      contentBoxSize: [{ inlineSize: width, blockSize: height }],
      contentRect: { width, height },
      ...fields,
    } as unknown as ResizeObserverEntry,
  ], {} as ResizeObserver);
}

describe(useElementSize, () => {
  beforeEach(() => {
    instances = [];
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('uses the initial size when the target resolves to no element', () => {
    const scope = effectScope();
    let size: ReturnType<typeof useElementSize>;
    scope.run(() => {
      size = useElementSize(ref(undefined), { width: 5, height: 7 });
    });

    expect(size!.width.value).toBe(5);
    expect(size!.height.value).toBe(7);
    scope.stop();
  });

  it('measures synchronously on mount via offset size', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'offsetWidth', { value: 80, configurable: true });
    Object.defineProperty(el, 'offsetHeight', { value: 60, configurable: true });
    const scope = effectScope();
    let size: ReturnType<typeof useElementSize>;
    scope.run(() => {
      size = useElementSize(ref(el), { width: 5, height: 7 });
    });

    // tryOnMounted runs synchronously outside a component, overwriting the initial size.
    expect(size!.width.value).toBe(80);
    expect(size!.height.value).toBe(60);
    scope.stop();
  });

  it('reports size from contentBoxSize', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let size: ReturnType<typeof useElementSize>;
    scope.run(() => {
      size = useElementSize(ref(el));
    });

    instances[0]!.cb([
      { contentBoxSize: [{ inlineSize: 100, blockSize: 50 }], contentRect: { width: 0, height: 0 } } as unknown as ResizeObserverEntry,
    ], {} as ResizeObserver);

    expect(size!.width.value).toBe(100);
    expect(size!.height.value).toBe(50);
    scope.stop();
  });

  it('falls back to contentRect when box sizes are missing', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let size: ReturnType<typeof useElementSize>;
    scope.run(() => {
      size = useElementSize(ref(el));
    });

    instances[0]!.cb([
      { contentBoxSize: undefined, contentRect: { width: 30, height: 40 } } as unknown as ResizeObserverEntry,
    ], {} as ResizeObserver);

    expect(size!.width.value).toBe(30);
    expect(size!.height.value).toBe(40);
    scope.stop();
  });

  it('normalises a single (non-array) ResizeObserverSize object', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let size: ReturnType<typeof useElementSize>;
    scope.run(() => {
      size = useElementSize(ref(el));
    });

    // Older Firefox reports box sizes as a single object rather than an array.
    instances[0]!.cb([
      { contentBoxSize: { inlineSize: 12, blockSize: 34 }, contentRect: { width: 0, height: 0 } } as unknown as ResizeObserverEntry,
    ], {} as ResizeObserver);

    expect(size!.width.value).toBe(12);
    expect(size!.height.value).toBe(34);
    scope.stop();
  });

  it('sums multiple box fragments in a single pass', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let size: ReturnType<typeof useElementSize>;
    scope.run(() => {
      size = useElementSize(ref(el));
    });

    instances[0]!.cb([
      {
        contentBoxSize: [
          { inlineSize: 10, blockSize: 5 },
          { inlineSize: 20, blockSize: 7 },
        ],
        contentRect: { width: 0, height: 0 },
      } as unknown as ResizeObserverEntry,
    ], {} as ResizeObserver);

    expect(size!.width.value).toBe(30);
    expect(size!.height.value).toBe(12);
    scope.stop();
  });

  it('reads borderBoxSize when box is "border-box"', () => {
    const el = document.createElement('div');
    const scope = effectScope();
    let size: ReturnType<typeof useElementSize>;
    scope.run(() => {
      size = useElementSize(ref(el), { width: 0, height: 0 }, { box: 'border-box' });
    });

    instances[0]!.cb([
      {
        borderBoxSize: [{ inlineSize: 200, blockSize: 120 }],
        contentBoxSize: [{ inlineSize: 1, blockSize: 1 }],
        contentRect: { width: 0, height: 0 },
      } as unknown as ResizeObserverEntry,
    ], {} as ResizeObserver);

    expect(size!.width.value).toBe(200);
    expect(size!.height.value).toBe(120);
    scope.stop();
  });

  it('measures SVG elements via getBoundingClientRect', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.getBoundingClientRect = () => ({ width: 64, height: 48 }) as DOMRect;
    const scope = effectScope();
    let size: ReturnType<typeof useElementSize>;
    scope.run(() => {
      size = useElementSize(ref(el), { width: 0, height: 0 }, { window: globalThis as unknown as Window });
    });

    // Even though the entry advertises a different box size, the SVG path wins.
    instances[0]!.cb([
      { contentBoxSize: [{ inlineSize: 999, blockSize: 999 }], contentRect: { width: 999, height: 999 } } as unknown as ResizeObserverEntry,
    ], {} as ResizeObserver);

    expect(size!.width.value).toBe(64);
    expect(size!.height.value).toBe(48);
    scope.stop();
  });

  it('resets to 0 when the element detaches', async () => {
    const el = ref<HTMLElement | undefined>(document.createElement('div'));
    const scope = effectScope();
    let size: ReturnType<typeof useElementSize>;
    scope.run(() => {
      size = useElementSize(el, { width: 5, height: 7 });
    });

    fire(100, 50);
    expect(size!.width.value).toBe(100);

    el.value = undefined;
    await nextTick();

    expect(size!.width.value).toBe(0);
    expect(size!.height.value).toBe(0);
    scope.stop();
  });

  it('stop() disconnects the observer and the detach watcher', async () => {
    const el = ref<HTMLElement | undefined>(document.createElement('div'));
    const scope = effectScope();
    let size: ReturnType<typeof useElementSize>;
    scope.run(() => {
      size = useElementSize(el, { width: 0, height: 0 });
    });

    await nextTick();
    expect(instances[0]!.disconnect).not.toHaveBeenCalled();

    fire(100, 50);
    expect(size!.width.value).toBe(100);

    size!.stop();
    // The observer is torn down so it stops delivering callbacks in a real browser.
    expect(instances[0]!.disconnect).toHaveBeenCalled();

    // The detach watcher is also stopped: clearing the target no longer resets the size to 0.
    el.value = undefined;
    await nextTick();
    expect(size!.width.value).toBe(100);
    expect(size!.height.value).toBe(50);
    scope.stop();
  });
});
