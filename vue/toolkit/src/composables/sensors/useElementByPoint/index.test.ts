import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useElementByPoint } from '.';

interface FakeDocument {
  elementFromPoint?: (x: number, y: number) => Element | null;
  elementsFromPoint?: (x: number, y: number) => Element[];
}

function makeDocument(over: FakeDocument): Document {
  return {
    elementFromPoint: () => null,
    elementsFromPoint: () => [],
    ...over,
  } as unknown as Document;
}

/**
 * Drive `requestAnimationFrame` so the raf loop callback runs synchronously.
 * Returns a restore function.
 */
function stubRaf() {
  const callbacks: FrameRequestCallback[] = [];
  const raf = vi.fn((cb: FrameRequestCallback) => {
    callbacks.push(cb);
    return callbacks.length;
  });
  const caf = vi.fn();
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCaf = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = raf as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = caf as typeof cancelAnimationFrame;

  return {
    raf,
    caf,
    flush(timestamp = 16) {
      const pending = callbacks.splice(0);
      for (const cb of pending)
        cb(timestamp);
    },
    restore() {
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCaf;
    },
  };
}

describe(useElementByPoint, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the topmost element at the point', () => {
    const target = document.createElement('div');
    const fromPoint = vi.fn(() => target);
    const doc = makeDocument({ elementFromPoint: fromPoint });
    const raf = stubRaf();

    const scope = effectScope();
    let api: ReturnType<typeof useElementByPoint>;
    scope.run(() => {
      api = useElementByPoint({ x: 10, y: 20, document: doc });
    });

    raf.flush();

    expect(fromPoint).toHaveBeenCalledWith(10, 20);
    expect(api!.element.value).toBe(target);

    scope.stop();
    raf.restore();
  });

  it('returns all elements at the point when multiple is set', () => {
    const a = document.createElement('div');
    const b = document.createElement('span');
    const fromPoints = vi.fn(() => [a, b]);
    const doc = makeDocument({ elementsFromPoint: fromPoints });
    const raf = stubRaf();

    const scope = effectScope();
    let api: ReturnType<typeof useElementByPoint<true>>;
    scope.run(() => {
      api = useElementByPoint({ x: 1, y: 2, multiple: true, document: doc });
    });

    raf.flush();

    expect(fromPoints).toHaveBeenCalledWith(1, 2);
    expect(api!.element.value).toEqual([a, b]);

    scope.stop();
    raf.restore();
  });

  it('initializes to null (single) and [] (multiple) before the first frame', () => {
    const doc = makeDocument({});

    const scope = effectScope();
    let single: ReturnType<typeof useElementByPoint>;
    let multi: ReturnType<typeof useElementByPoint<true>>;
    scope.run(() => {
      single = useElementByPoint({ x: 0, y: 0, document: doc, immediate: false });
      multi = useElementByPoint({ x: 0, y: 0, multiple: true, document: doc, immediate: false });
    });

    expect(single!.element.value).toBe(null);
    expect(multi!.element.value).toEqual([]);

    scope.stop();
  });

  it('tracks reactive coordinates on each frame', () => {
    const fromPoint = vi.fn(() => null);
    const doc = makeDocument({ elementFromPoint: fromPoint });
    const raf = stubRaf();
    const x = shallowRef(5);
    const y = shallowRef(6);

    const scope = effectScope();
    scope.run(() => {
      useElementByPoint({ x, y, document: doc });
    });

    raf.flush();
    expect(fromPoint).toHaveBeenLastCalledWith(5, 6);

    x.value = 100;
    y.value = 200;
    raf.flush();
    expect(fromPoint).toHaveBeenLastCalledWith(100, 200);

    scope.stop();
    raf.restore();
  });

  it('does not probe before resume when immediate is false', () => {
    const fromPoint = vi.fn(() => null);
    const doc = makeDocument({ elementFromPoint: fromPoint });
    const raf = stubRaf();

    const scope = effectScope();
    let api: ReturnType<typeof useElementByPoint>;
    scope.run(() => {
      api = useElementByPoint({ x: 0, y: 0, document: doc, immediate: false });
    });

    raf.flush();
    expect(fromPoint).not.toHaveBeenCalled();

    api!.resume();
    raf.flush();
    expect(fromPoint).toHaveBeenCalledTimes(1);

    scope.stop();
    raf.restore();
  });

  it('stops probing after pause', () => {
    const fromPoint = vi.fn(() => null);
    const doc = makeDocument({ elementFromPoint: fromPoint });
    const raf = stubRaf();

    const scope = effectScope();
    let api: ReturnType<typeof useElementByPoint>;
    scope.run(() => {
      api = useElementByPoint({ x: 0, y: 0, document: doc });
    });

    raf.flush();
    expect(fromPoint).toHaveBeenCalledTimes(1);

    api!.pause();
    raf.flush();
    expect(fromPoint).toHaveBeenCalledTimes(1);

    scope.stop();
    raf.restore();
  });

  it('reports supported when the relevant API exists', async () => {
    const doc = makeDocument({});

    const scope = effectScope();
    let single: ReturnType<typeof useElementByPoint>;
    let multi: ReturnType<typeof useElementByPoint<true>>;
    scope.run(() => {
      single = useElementByPoint({ x: 0, y: 0, document: doc, immediate: false });
      multi = useElementByPoint({ x: 0, y: 0, multiple: true, document: doc, immediate: false });
    });
    await nextTick();

    expect(single!.isSupported.value).toBeTruthy();
    expect(multi!.isSupported.value).toBeTruthy();

    scope.stop();
  });

  it('reports unsupported when document is undefined (SSR)', async () => {
    const scope = effectScope();
    let api: ReturnType<typeof useElementByPoint>;
    scope.run(() => {
      api = useElementByPoint({ x: 0, y: 0, document: undefined, immediate: false });
    });
    await nextTick();

    expect(api!.isSupported.value).toBeFalsy();
    expect(api!.element.value).toBe(null);

    scope.stop();
  });

  it('does not throw and leaves element untouched when the point API is missing', () => {
    // a document object without elementFromPoint (e.g. jsdom)
    const doc = { ownerDocument: null } as unknown as Document;
    const raf = stubRaf();

    const scope = effectScope();
    let api: ReturnType<typeof useElementByPoint>;
    scope.run(() => {
      api = useElementByPoint({ x: 0, y: 0, document: doc });
    });

    expect(() => raf.flush()).not.toThrow();
    expect(api!.element.value).toBe(null);

    scope.stop();
    raf.restore();
  });

  it('reports unsupported when the API is missing from document', async () => {
    const doc = { elementsFromPoint: () => [] } as unknown as Document;

    const scope = effectScope();
    let api: ReturnType<typeof useElementByPoint>;
    scope.run(() => {
      // single mode but only elementsFromPoint is present
      api = useElementByPoint({ x: 0, y: 0, document: doc, immediate: false });
    });
    await nextTick();

    expect(api!.isSupported.value).toBeFalsy();

    scope.stop();
  });

  it('stops probing once the scope is disposed', () => {
    const fromPoint = vi.fn(() => null);
    const doc = makeDocument({ elementFromPoint: fromPoint });
    const raf = stubRaf();

    const scope = effectScope();
    scope.run(() => {
      useElementByPoint({ x: 0, y: 0, document: doc });
    });

    raf.flush();
    expect(fromPoint).toHaveBeenCalledTimes(1);

    scope.stop();
    raf.flush();
    expect(fromPoint).toHaveBeenCalledTimes(1);

    raf.restore();
  });
});
