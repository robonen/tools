import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useDocumentPiP } from '.';
import type { DocumentPictureInPictureOptions } from '.';

/**
 * Build a fake Picture-in-Picture `Window` that records its listeners and
 * `close()` call. Passed through options so it reaches the import-time-captured
 * `defaultWindow` substitute (see test gotcha).
 */
function createPipWindow() {
  const listeners = new Map<string, EventListener>();

  const pip = {
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.set(type, listener);
    }),
    close: vi.fn(),
  } as unknown as Window;

  function firePagehide() {
    listeners.get('pagehide')?.(new Event('pagehide'));
  }

  return { pip, firePagehide, close: pip.close as ReturnType<typeof vi.fn> };
}

function createWindow(pip: Window) {
  const requestWindow = vi.fn(async (_options?: DocumentPictureInPictureOptions) => pip);
  const win = {
    documentPictureInPicture: { window: null, requestWindow },
  } as unknown as Window & typeof globalThis;

  return { window: win, requestWindow };
}

describe(useDocumentPiP, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports supported when documentPictureInPicture exists on window', () => {
    const scope = effectScope();
    const { pip } = createPipWindow();
    const { window } = createWindow(pip);

    let result: ReturnType<typeof useDocumentPiP>;
    scope.run(() => {
      result = useDocumentPiP({ window });
    });

    expect(result!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('reports unsupported when the API is absent', () => {
    const scope = effectScope();
    const win = {} as unknown as Window & typeof globalThis;

    let result: ReturnType<typeof useDocumentPiP>;
    scope.run(() => {
      result = useDocumentPiP({ window: win });
    });

    expect(result!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('is SSR safe when window is undefined', async () => {
    const scope = effectScope();

    let result: ReturnType<typeof useDocumentPiP>;
    scope.run(() => {
      result = useDocumentPiP({ window: undefined as unknown as Window });
    });

    expect(result!.isSupported.value).toBeFalsy();
    await expect(result!.open()).resolves.toBeUndefined();
    scope.stop();
  });

  it('opens a PiP window, tracks it, and forwards options', async () => {
    const scope = effectScope();
    const { pip } = createPipWindow();
    const { window, requestWindow } = createWindow(pip);

    let result: ReturnType<typeof useDocumentPiP>;
    scope.run(() => {
      result = useDocumentPiP({ window });
    });

    const returned = await result!.open({ width: 320, height: 240 });
    await nextTick();

    expect(requestWindow).toHaveBeenCalledWith({ width: 320, height: 240 });
    expect(returned).toBe(pip);
    expect(result!.pipWindow.value).toBe(pip);
    expect(result!.isOpen.value).toBeTruthy();
    scope.stop();
  });

  it('clears the reference when the PiP window emits pagehide', async () => {
    const scope = effectScope();
    const { pip, firePagehide } = createPipWindow();
    const { window } = createWindow(pip);

    let result: ReturnType<typeof useDocumentPiP>;
    scope.run(() => {
      result = useDocumentPiP({ window });
    });

    await result!.open();
    expect(result!.isOpen.value).toBeTruthy();

    firePagehide();
    await nextTick();

    expect(result!.pipWindow.value).toBeNull();
    expect(result!.isOpen.value).toBeFalsy();
    scope.stop();
  });

  it('close() closes the window and clears state', async () => {
    const scope = effectScope();
    const { pip, close } = createPipWindow();
    const { window } = createWindow(pip);

    let result: ReturnType<typeof useDocumentPiP>;
    scope.run(() => {
      result = useDocumentPiP({ window });
    });

    await result!.open();
    result!.close();

    expect(close).toHaveBeenCalledTimes(1);
    expect(result!.pipWindow.value).toBeNull();
    scope.stop();
  });

  it('closes the PiP window when the scope is disposed', async () => {
    const scope = effectScope();
    const { pip, close } = createPipWindow();
    const { window } = createWindow(pip);

    let result: ReturnType<typeof useDocumentPiP>;
    scope.run(() => {
      result = useDocumentPiP({ window });
    });

    await result!.open();
    scope.stop();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('stores the error and invokes onError when open() rejects', async () => {
    const scope = effectScope();
    const error = new DOMException('gesture required', 'NotAllowedError');
    const requestWindow = vi.fn(async () => {
      throw error;
    });
    const win = {
      documentPictureInPicture: { window: null, requestWindow },
    } as unknown as Window & typeof globalThis;
    const onError = vi.fn();

    let result: ReturnType<typeof useDocumentPiP>;
    scope.run(() => {
      result = useDocumentPiP({ window: win, onError });
    });

    await expect(result!.open()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(error);
    expect(result!.error.value).toBe(error);
    expect(result!.isOpen.value).toBeFalsy();
    scope.stop();
  });
});
