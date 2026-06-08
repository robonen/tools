import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, shallowRef } from 'vue';
import { usePointerLock } from '.';

interface FakeDocument {
  pointerLockElement: Element | null;
  exitPointerLock: ReturnType<typeof vi.fn>;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  dispatch: (type: string, event?: Event) => void;
  /**
   * Attach a fake `requestPointerLock` to a real DOM node so that calling it
   * acquires the lock on this fake document (mirroring real browser behavior,
   * where `requestPointerLock` lives on the Element and updates the document).
   */
  bind: (node: Element) => Element;
  requestPointerLock: ReturnType<typeof vi.fn>;
}

/**
 * jsdom does not implement the Pointer Lock API, so we build a minimal fake
 * document plus an element binder that records `requestPointerLock`/
 * `exitPointerLock` calls and lets tests drive `pointerlockchange` /
 * `pointerlockerror` transitions manually.
 */
function createFakeDocument(supported = true): FakeDocument {
  const listeners = new Map<string, Set<EventListener>>();

  const requestPointerLock = vi.fn(function (this: Element) {
    doc.pointerLockElement = this;
    doc.dispatch('pointerlockchange');
  });

  const doc: FakeDocument = {
    pointerLockElement: null,
    requestPointerLock,
    exitPointerLock: vi.fn(() => {
      doc.pointerLockElement = null;
      doc.dispatch('pointerlockchange');
    }),
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type, event = new Event(type)) {
      listeners.get(type)?.forEach(fn => fn.call(doc, event));
    },
    bind(node) {
      (node as unknown as { requestPointerLock: () => void }).requestPointerLock = requestPointerLock;
      return node;
    },
  };

  if (!supported)
    delete (doc as Partial<FakeDocument>).pointerLockElement;

  return doc;
}

describe(usePointerLock, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports supported when document exposes pointerLockElement', () => {
    const doc = createFakeDocument(true);
    const scope = effectScope();
    let api: ReturnType<typeof usePointerLock>;
    scope.run(() => {
      api = usePointerLock(undefined, { document: doc as unknown as Document });
    });

    expect(api!.isSupported.value).toBeTruthy();

    scope.stop();
  });

  it('reports unsupported when the API is missing', () => {
    const doc = createFakeDocument(false);
    const scope = effectScope();
    let api: ReturnType<typeof usePointerLock>;
    scope.run(() => {
      api = usePointerLock(undefined, { document: doc as unknown as Document });
    });

    expect(api!.isSupported.value).toBeFalsy();

    scope.stop();
  });

  it('is SSR-safe when no document is available', () => {
    const scope = effectScope();
    let api: ReturnType<typeof usePointerLock>;
    scope.run(() => {
      // Pass an explicit undefined document to emulate SSR (no globals touched).
      api = usePointerLock(undefined, { document: undefined });
    });

    expect(api!.isSupported.value).toBeFalsy();
    expect(api!.element.value).toBeUndefined();

    scope.stop();
  });

  it('locks an element ref and tracks the locked element', async () => {
    const doc = createFakeDocument(true);
    const node = doc.bind(document.createElement('canvas'));
    const elRef = shallowRef<HTMLElement | null>(node as HTMLElement);

    const scope = effectScope();
    let api: ReturnType<typeof usePointerLock>;
    scope.run(() => {
      api = usePointerLock(elRef, { document: doc as unknown as Document });
    });

    const locked = await api!.lock(elRef);

    expect(locked).toBe(node);
    expect(api!.element.value).toBe(node);
    expect(doc.requestPointerLock).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('locks the event currentTarget, falling back to the configured target', async () => {
    const doc = createFakeDocument(true);
    const node = doc.bind(document.createElement('canvas'));

    const scope = effectScope();
    let api: ReturnType<typeof usePointerLock>;
    scope.run(() => {
      api = usePointerLock(undefined, { document: doc as unknown as Document });
    });

    const event = new Event('click');
    Object.defineProperty(event, 'currentTarget', { value: node });

    const locked = await api!.lock(event);

    expect(locked).toBe(node);
    expect(api!.triggerElement.value).toBe(node);
    expect(api!.element.value).toBe(node);

    scope.stop();
  });

  it('unlocks and resets the tracked elements', async () => {
    const doc = createFakeDocument(true);
    const node = doc.bind(document.createElement('canvas'));
    const elRef = shallowRef<HTMLElement | null>(node as HTMLElement);

    const scope = effectScope();
    let api: ReturnType<typeof usePointerLock>;
    scope.run(() => {
      api = usePointerLock(elRef, { document: doc as unknown as Document });
    });

    await api!.lock(elRef);
    expect(api!.element.value).toBe(node);

    const released = await api!.unlock();

    expect(released).toBeTruthy();
    expect(doc.exitPointerLock).toHaveBeenCalledTimes(1);
    expect(api!.element.value).toBeFalsy();
    expect(api!.triggerElement.value).toBeNull();

    scope.stop();
  });

  it('unlock returns false when nothing is locked', async () => {
    const doc = createFakeDocument(true);
    const scope = effectScope();
    let api: ReturnType<typeof usePointerLock>;
    scope.run(() => {
      api = usePointerLock(undefined, { document: doc as unknown as Document });
    });

    const released = await api!.unlock();

    expect(released).toBeFalsy();
    expect(doc.exitPointerLock).not.toHaveBeenCalled();

    scope.stop();
  });

  it('rejects lock when unsupported', async () => {
    const doc = createFakeDocument(false);
    const node = document.createElement('canvas');
    const elRef = shallowRef<HTMLElement | null>(node);

    const scope = effectScope();
    let api: ReturnType<typeof usePointerLock>;
    scope.run(() => {
      api = usePointerLock(elRef, { document: doc as unknown as Document });
    });

    await expect(api!.lock(elRef)).rejects.toThrow(/not supported/i);

    scope.stop();
  });

  it('rejects lock when target is undefined', async () => {
    const doc = createFakeDocument(true);
    const elRef = shallowRef<HTMLElement | null>(null);

    const scope = effectScope();
    let api: ReturnType<typeof usePointerLock>;
    scope.run(() => {
      api = usePointerLock(undefined, { document: doc as unknown as Document });
    });

    await expect(api!.lock(elRef)).rejects.toThrow(/undefined/i);

    scope.stop();
  });

  it('invokes onError when a pointerlockerror fires for the locked target', async () => {
    const onError = vi.fn();
    const doc = createFakeDocument(true);
    const node = doc.bind(document.createElement('canvas'));

    // requestPointerLock that acquires the lock, then immediately errors.
    doc.requestPointerLock.mockImplementation(function (this: Element) {
      doc.pointerLockElement = this;
      doc.dispatch('pointerlockchange');
      doc.dispatch('pointerlockerror');
    });

    const elRef = shallowRef<HTMLElement | null>(node as HTMLElement);

    const scope = effectScope();
    let api: ReturnType<typeof usePointerLock>;
    scope.run(() => {
      api = usePointerLock(elRef, { document: doc as unknown as Document, onError });
    });

    await api!.lock(elRef);

    expect(onError).toHaveBeenCalledTimes(1);

    scope.stop();
  });
});
