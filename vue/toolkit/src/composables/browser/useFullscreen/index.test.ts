import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useFullscreen } from '.';

type Listener = (ev: Event) => void;

interface FakeEl {
  requestFullscreen: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

interface FakeDoc {
  documentElement: FakeEl;
  exitFullscreen: ReturnType<typeof vi.fn>;
  fullscreenElement: Element | null;
  fullScreen: boolean;
  addEventListener: (event: string, cb: Listener) => void;
  removeEventListener: (event: string, cb: Listener) => void;
  dispatch: (event: string) => void;
}

function createFakeElement(): FakeEl {
  return {
    requestFullscreen: vi.fn(async () => {}),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function createFakeDocument(el?: FakeEl): FakeDoc {
  const listeners = new Map<string, Set<Listener>>();
  const documentElement = el ?? createFakeElement();

  const doc: FakeDoc = {
    documentElement,
    exitFullscreen: vi.fn(async () => {}),
    fullscreenElement: null,
    fullScreen: false,
    addEventListener(event, cb) {
      if (!listeners.has(event))
        listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
    },
    removeEventListener(event, cb) {
      listeners.get(event)?.delete(cb);
    },
    dispatch(event) {
      listeners.get(event)?.forEach(cb => cb(new Event(event)));
    },
  };

  return doc;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(useFullscreen, () => {
  it('reports support when request/exit/flag methods exist', () => {
    const document = createFakeDocument();
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document: document as unknown as Document });
    });
    expect(fs!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('is not supported when the Fullscreen API is absent (SSR/unsupported)', () => {
    const document = {
      documentElement: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document });
    });
    expect(fs!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('is not supported when no document is available (SSR)', () => {
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    // No document and no defaultDocument in jsdom-less branch — pass an explicit undefined.
    scope.run(() => {
      fs = useFullscreen(undefined, { document: undefined });
    });
    expect(fs!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('starts not fullscreen', () => {
    const document = createFakeDocument();
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document: document as unknown as Document });
    });
    expect(fs!.isFullscreen.value).toBeFalsy();
    scope.stop();
  });

  it('enter() requests fullscreen on the target element and sets the flag', async () => {
    const el = createFakeElement();
    const document = createFakeDocument(el);
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document: document as unknown as Document });
    });

    await fs!.enter();
    expect(el.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(fs!.isFullscreen.value).toBeTruthy();
    scope.stop();
  });

  it('enter() requests fullscreen on a provided target element', async () => {
    const target = createFakeElement();
    const document = createFakeDocument();
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(target as unknown as HTMLElement, { document: document as unknown as Document });
    });

    await fs!.enter();
    expect(target.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(document.documentElement.requestFullscreen).not.toHaveBeenCalled();
    expect(fs!.isFullscreen.value).toBeTruthy();
    scope.stop();
  });

  it('enter() is a no-op when already fullscreen', async () => {
    const el = createFakeElement();
    const document = createFakeDocument(el);
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document: document as unknown as Document });
    });

    await fs!.enter();
    el.requestFullscreen.mockClear();
    await fs!.enter();
    expect(el.requestFullscreen).not.toHaveBeenCalled();
    scope.stop();
  });

  it('exit() calls exitFullscreen and clears the flag', async () => {
    const el = createFakeElement();
    const document = createFakeDocument(el);
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document: document as unknown as Document });
    });

    await fs!.enter();
    await fs!.exit();
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(fs!.isFullscreen.value).toBeFalsy();
    scope.stop();
  });

  it('exit() is a no-op when not fullscreen', async () => {
    const document = createFakeDocument();
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document: document as unknown as Document });
    });

    await fs!.exit();
    expect(document.exitFullscreen).not.toHaveBeenCalled();
    scope.stop();
  });

  it('toggle() flips between enter and exit', async () => {
    const el = createFakeElement();
    const document = createFakeDocument(el);
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document: document as unknown as Document });
    });

    await fs!.toggle();
    expect(fs!.isFullscreen.value).toBeTruthy();
    expect(el.requestFullscreen).toHaveBeenCalledTimes(1);

    await fs!.toggle();
    expect(fs!.isFullscreen.value).toBeFalsy();
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('does nothing when unsupported', async () => {
    const document = {
      documentElement: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document });
    });

    await fs!.enter();
    expect(fs!.isFullscreen.value).toBeFalsy();
    scope.stop();
  });

  it('syncs isFullscreen to true on fullscreenchange when our element is the fullscreen element', async () => {
    const document = createFakeDocument();
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document: document as unknown as Document });
    });

    // Simulate the browser entering fullscreen for the document element.
    document.fullScreen = true;
    document.fullscreenElement = document.documentElement as unknown as Element;
    document.dispatch('fullscreenchange');
    await nextTick();

    expect(fs!.isFullscreen.value).toBeTruthy();
    scope.stop();
  });

  it('syncs isFullscreen to false on fullscreenchange when fullscreen ends', async () => {
    const el = createFakeElement();
    const document = createFakeDocument(el);
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document: document as unknown as Document });
    });

    await fs!.enter();
    expect(fs!.isFullscreen.value).toBeTruthy();

    // Browser exits fullscreen (e.g. user pressed Escape).
    document.fullScreen = false;
    document.fullscreenElement = null;
    document.dispatch('fullscreenchange');
    await nextTick();

    expect(fs!.isFullscreen.value).toBeFalsy();
    scope.stop();
  });

  it('resolves the target from a getter ref', async () => {
    const target = createFakeElement();
    const elRef = shallowRef<FakeEl | null>(null);
    const document = createFakeDocument();
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(() => elRef.value as unknown as HTMLElement, { document: document as unknown as Document });
    });

    elRef.value = target;
    await nextTick();

    await fs!.enter();
    expect(target.requestFullscreen).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('autoExit exits fullscreen when the scope is disposed', async () => {
    const el = createFakeElement();
    const document = createFakeDocument(el);
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document: document as unknown as Document, autoExit: true });
    });

    await fs!.enter();
    expect(fs!.isFullscreen.value).toBeTruthy();

    scope.stop();
    // onScopeDispose triggers exit() (fire-and-forget); allow the microtask to flush.
    await Promise.resolve();
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('does not autoExit by default', async () => {
    const el = createFakeElement();
    const document = createFakeDocument(el);
    const scope = effectScope();
    let fs: ReturnType<typeof useFullscreen>;
    scope.run(() => {
      fs = useFullscreen(undefined, { document: document as unknown as Document });
    });

    await fs!.enter();
    scope.stop();
    await Promise.resolve();
    expect(document.exitFullscreen).not.toHaveBeenCalled();
  });
});
