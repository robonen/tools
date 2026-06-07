import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useEyeDropper } from '.';

/**
 * Build a fake `window` carrying an `EyeDropper` constructor whose `open()`
 * resolves with the supplied hex. Passed through options so it reaches the
 * import-time-captured `defaultWindow` substitute (see test gotcha).
 */
function createWindowWithEyeDropper(hex = '#ff0000') {
  const open = vi.fn(async (_options?: { signal?: AbortSignal }) => ({ sRGBHex: hex }));

  class EyeDropper {
    open = open;
    get [Symbol.toStringTag]() {
      return 'EyeDropper' as const;
    }
  }

  const win = { EyeDropper } as unknown as Window & typeof globalThis;

  return { window: win, open };
}

describe(useEyeDropper, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reports supported when EyeDropper exists on window', () => {
    const scope = effectScope();
    const { window } = createWindowWithEyeDropper();

    let result: ReturnType<typeof useEyeDropper>;
    scope.run(() => {
      result = useEyeDropper({ window });
    });

    expect(result!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('reports unsupported when EyeDropper is absent', () => {
    const scope = effectScope();
    const win = {} as unknown as Window & typeof globalThis;

    let result: ReturnType<typeof useEyeDropper>;
    scope.run(() => {
      result = useEyeDropper({ window: win });
    });

    expect(result!.isSupported.value).toBeFalsy();
    scope.stop();
  });

  it('is SSR safe when window is undefined', async () => {
    const scope = effectScope();

    let result: ReturnType<typeof useEyeDropper>;
    scope.run(() => {
      result = useEyeDropper({ window: undefined as unknown as Window });
    });

    expect(result!.isSupported.value).toBeFalsy();
    await expect(result!.open()).resolves.toBeUndefined();
    scope.stop();
  });

  it('defaults sRGBHex to an empty string', () => {
    const scope = effectScope();
    const { window } = createWindowWithEyeDropper();

    let result: ReturnType<typeof useEyeDropper>;
    scope.run(() => {
      result = useEyeDropper({ window });
    });

    expect(result!.sRGBHex.value).toBe('');
    scope.stop();
  });

  it('honors the initialValue option', () => {
    const scope = effectScope();
    const { window } = createWindowWithEyeDropper();

    let result: ReturnType<typeof useEyeDropper>;
    scope.run(() => {
      result = useEyeDropper({ window, initialValue: '#123456' });
    });

    expect(result!.sRGBHex.value).toBe('#123456');
    scope.stop();
  });

  it('updates sRGBHex and returns the result when open() succeeds', async () => {
    const scope = effectScope();
    const { window, open } = createWindowWithEyeDropper('#00ff00');

    let result: ReturnType<typeof useEyeDropper>;
    scope.run(() => {
      result = useEyeDropper({ window });
    });

    const picked = await result!.open();

    expect(open).toHaveBeenCalledTimes(1);
    expect(picked).toEqual({ sRGBHex: '#00ff00' });

    await nextTick();
    expect(result!.sRGBHex.value).toBe('#00ff00');
    scope.stop();
  });

  it('forwards open options (e.g. AbortSignal) to the native open()', async () => {
    const scope = effectScope();
    const { window, open } = createWindowWithEyeDropper();

    let result: ReturnType<typeof useEyeDropper>;
    scope.run(() => {
      result = useEyeDropper({ window });
    });

    const controller = new AbortController();
    await result!.open({ signal: controller.signal });

    expect(open).toHaveBeenCalledWith({ signal: controller.signal });
    scope.stop();
  });

  it('returns undefined and does not call the API when unsupported', async () => {
    const scope = effectScope();
    const win = {} as unknown as Window & typeof globalThis;

    let result: ReturnType<typeof useEyeDropper>;
    scope.run(() => {
      result = useEyeDropper({ window: win });
    });

    await expect(result!.open()).resolves.toBeUndefined();
    expect(result!.sRGBHex.value).toBe('');
    scope.stop();
  });

  it('propagates rejection when the user cancels the picker', async () => {
    const scope = effectScope();
    const error = new DOMException('aborted', 'AbortError');

    class EyeDropper {
      open = vi.fn(async () => {
        throw error;
      });

      get [Symbol.toStringTag]() {
        return 'EyeDropper' as const;
      }
    }
    const win = { EyeDropper } as unknown as Window & typeof globalThis;

    let result: ReturnType<typeof useEyeDropper>;
    scope.run(() => {
      result = useEyeDropper({ window: win });
    });

    await expect(result!.open()).rejects.toThrow(error);
    expect(result!.sRGBHex.value).toBe('');
    scope.stop();
  });
});
