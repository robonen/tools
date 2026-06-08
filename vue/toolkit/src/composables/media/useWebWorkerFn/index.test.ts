import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import type { UseWebWorkerFnReturn } from '.';
import { useWebWorkerFn } from '.';

/**
 * A fake Worker that runs the blob source synchronously by exposing the
 * function from `onmessage`. We don't actually execute the stringified code —
 * instead the test supplies a behavior closure that decides what to post back.
 */
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminate = vi.fn();
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeWorker.created.push(this);
  }

  postMessage(data: unknown): void {
    FakeWorker.lastMessage = data;
    FakeWorker.behavior?.(this, data);
  }

  static created: FakeWorker[] = [];
  static lastMessage: unknown;
  static behavior: ((worker: FakeWorker, data: unknown) => void) | null = null;

  static reset(): void {
    FakeWorker.created = [];
    FakeWorker.lastMessage = undefined;
    FakeWorker.behavior = null;
  }
}

function stubWindow(): { window: Window; createObjectURL: ReturnType<typeof vi.fn>; revokeObjectURL: ReturnType<typeof vi.fn>; clearTimeout: ReturnType<typeof vi.fn> } {
  const createObjectURL = vi.fn(() => 'blob:fake-url');
  const revokeObjectURL = vi.fn();
  const clearTimeout = vi.fn((id: number) => globalThis.clearTimeout(id));
  const setTimeout = ((cb: () => void, ms?: number) => globalThis.setTimeout(cb, ms)) as Window['setTimeout'];

  const window = {
    Worker: FakeWorker as unknown as typeof Worker,
    Blob: globalThis.Blob,
    URL: { createObjectURL, revokeObjectURL } as unknown as typeof URL,
    setTimeout,
    clearTimeout,
  } as unknown as Window;

  return { window, createObjectURL, revokeObjectURL, clearTimeout };
}

beforeEach(() => {
  FakeWorker.reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe(useWebWorkerFn, () => {
  it('reports support when Worker / Blob / URL exist on the window', () => {
    const { window } = stubWindow();
    const scope = effectScope();
    let api: UseWebWorkerFnReturn<() => number>;
    scope.run(() => {
      api = useWebWorkerFn(() => 1, { window });
    });
    expect(api!.isSupported.value).toBeTruthy();
    expect(api!.workerStatus.value).toBe('PENDING');
    scope.stop();
  });

  it('is unsupported and rejects without throwing (SSR path)', async () => {
    const window = {} as unknown as Window;
    const scope = effectScope();
    let api: UseWebWorkerFnReturn<() => number>;
    scope.run(() => {
      api = useWebWorkerFn(() => 1, { window });
    });

    expect(api!.isSupported.value).toBeFalsy();
    await expect(api!.workerFn()).rejects.toThrow(/not supported/);
    expect(() => api!.workerTerminate()).not.toThrow();
    scope.stop();
  });

  it('resolves with the worker result on SUCCESS', async () => {
    const { window } = stubWindow();
    FakeWorker.behavior = (worker) => {
      worker.onmessage?.({ data: ['SUCCESS', 42] } as MessageEvent);
    };

    const scope = effectScope();
    let api: UseWebWorkerFnReturn<(a: number, b: number) => number>;
    scope.run(() => {
      api = useWebWorkerFn((a: number, b: number) => a + b, { window });
    });

    await expect(api!.workerFn(40, 2)).resolves.toBe(42);
    expect(FakeWorker.lastMessage).toEqual([[40, 2]]);
    expect(api!.workerStatus.value).toBe('SUCCESS');
    scope.stop();
  });

  it('rejects and calls onError on an ERROR message', async () => {
    const { window } = stubWindow();
    const onError = vi.fn();
    FakeWorker.behavior = (worker) => {
      worker.onmessage?.({ data: ['ERROR', 'boom'] } as MessageEvent);
    };

    const scope = effectScope();
    let api: UseWebWorkerFnReturn<() => number>;
    scope.run(() => {
      api = useWebWorkerFn(() => 1, { window, onError });
    });

    await expect(api!.workerFn()).rejects.toBe('boom');
    expect(onError).toHaveBeenCalledWith('boom');
    expect(api!.workerStatus.value).toBe('ERROR');
    scope.stop();
  });

  it('rejects and calls onError on a worker error event', async () => {
    const { window } = stubWindow();
    const onError = vi.fn();
    const errorEvent = { preventDefault: vi.fn(), message: 'crashed' } as unknown as ErrorEvent;
    FakeWorker.behavior = (worker) => {
      worker.onerror?.(errorEvent);
    };

    const scope = effectScope();
    let api: UseWebWorkerFnReturn<() => number>;
    scope.run(() => {
      api = useWebWorkerFn(() => 1, { window, onError });
    });

    await expect(api!.workerFn()).rejects.toBe(errorEvent);
    expect(errorEvent.preventDefault).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(errorEvent);
    expect(api!.workerStatus.value).toBe('ERROR');
    scope.stop();
  });

  it('sets RUNNING status while a run is in flight', () => {
    const { window } = stubWindow();
    // behavior left null: worker never posts back -> stays RUNNING
    const scope = effectScope();
    let api: UseWebWorkerFnReturn<() => number>;
    scope.run(() => {
      api = useWebWorkerFn(() => 1, { window });
    });

    void api!.workerFn();
    expect(api!.workerStatus.value).toBe('RUNNING');
    scope.stop();
  });

  it('rejects a second concurrent run while one is active', async () => {
    const { window } = stubWindow();
    const scope = effectScope();
    let api: UseWebWorkerFnReturn<() => number>;
    scope.run(() => {
      api = useWebWorkerFn(() => 1, { window });
    });

    void api!.workerFn();
    await expect(api!.workerFn()).rejects.toThrow(/one worker run/);
    scope.stop();
  });

  it('forwards dependencies and creates a blob URL', () => {
    const { window, createObjectURL } = stubWindow();
    const scope = effectScope();
    scope.run(() => {
      const api = useWebWorkerFn(() => 1, {
        window,
        dependencies: ['https://cdn/dep.js'],
        localDependencies: [function helper() { return 2; }],
      });
      void api.workerFn();
    });

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    scope.stop();
  });

  it('terminates and revokes the object URL on success', async () => {
    const { window, revokeObjectURL } = stubWindow();
    FakeWorker.behavior = (worker) => {
      worker.onmessage?.({ data: ['SUCCESS', 'ok'] } as MessageEvent);
    };

    const scope = effectScope();
    let api: UseWebWorkerFnReturn<() => string>;
    scope.run(() => {
      api = useWebWorkerFn(() => 'ok', { window });
    });

    await api!.workerFn();
    expect(FakeWorker.created[0]!.terminate).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
    scope.stop();
  });

  it('workerTerminate resets the status and tears down the worker', () => {
    const { window, revokeObjectURL } = stubWindow();
    const scope = effectScope();
    let api: UseWebWorkerFnReturn<() => number>;
    scope.run(() => {
      api = useWebWorkerFn(() => 1, { window });
    });

    void api!.workerFn();
    api!.workerTerminate();
    expect(FakeWorker.created[0]!.terminate).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(api!.workerStatus.value).toBe('PENDING');
    scope.stop();
  });

  it('honors a custom termination status', () => {
    const { window } = stubWindow();
    const scope = effectScope();
    let api: UseWebWorkerFnReturn<() => number>;
    scope.run(() => {
      api = useWebWorkerFn(() => 1, { window });
    });

    void api!.workerFn();
    api!.workerTerminate('TIMEOUT_EXPIRED');
    expect(api!.workerStatus.value).toBe('TIMEOUT_EXPIRED');
    scope.stop();
  });

  it('times out and rejects with TIMEOUT_EXPIRED', async () => {
    vi.useFakeTimers();
    const { window } = stubWindow();
    const onError = vi.fn();
    // never post back -> let the timeout fire
    const scope = effectScope();
    let api: UseWebWorkerFnReturn<() => number>;
    scope.run(() => {
      api = useWebWorkerFn(() => 1, { window, timeout: 1000, onError });
    });

    const pending = api!.workerFn();
    // eslint-disable-next-line vitest/valid-expect -- intentionally deferred; awaited below after advancing timers
    const assertion = expect(pending).rejects.toThrow('TIMEOUT_EXPIRED');
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(api!.workerStatus.value).toBe('TIMEOUT_EXPIRED');
    expect(onError).toHaveBeenCalledOnce();
    scope.stop();
  });

  it('terminates automatically when the scope is disposed', async () => {
    const { window } = stubWindow();
    const scope = effectScope();
    let api: UseWebWorkerFnReturn<() => number>;
    scope.run(() => {
      api = useWebWorkerFn(() => 1, { window });
    });

    void api!.workerFn();
    await nextTick();
    scope.stop();
    expect(FakeWorker.created[0]!.terminate).toHaveBeenCalledOnce();
  });
});
