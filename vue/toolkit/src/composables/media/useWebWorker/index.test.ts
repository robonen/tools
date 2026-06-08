import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import type { UseWebWorkerReturn } from '.';
import { useWebWorker } from '.';

class FakeWorker {
  listeners: Record<string, Set<(event: any) => void>> = {};
  postMessage = vi.fn();
  terminate = vi.fn();

  addEventListener(type: string, listener: (event: any) => void): void {
    (this.listeners[type] ??= new Set()).add(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void): void {
    this.listeners[type]?.delete(listener);
  }

  emit(type: string, event: any): void {
    this.listeners[type]?.forEach(listener => listener(event));
  }
}

function stubWindow(): { window: Window; WorkerCtor: ReturnType<typeof vi.fn>; created: FakeWorker[] } {
  const created: FakeWorker[] = [];
  const WorkerCtor = vi.fn(function (this: unknown) {
    const instance = new FakeWorker();
    created.push(instance);
    return instance as unknown as Worker;
  });

  const window = { Worker: WorkerCtor } as unknown as Window;
  return { window, WorkerCtor, created };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(useWebWorker, () => {
  it('reports support when Worker exists on the window', () => {
    const { window } = stubWindow();
    const scope = effectScope();
    let ww: UseWebWorkerReturn;
    scope.run(() => {
      ww = useWebWorker('/worker.js', { window });
    });
    expect(ww!.isSupported.value).toBeTruthy();
    scope.stop();
  });

  it('is not supported and is a no-op without Worker (SSR path)', () => {
    const window = {} as unknown as Window;
    const scope = effectScope();
    let ww: UseWebWorkerReturn;
    scope.run(() => {
      ww = useWebWorker('/worker.js', { window });
    });
    expect(ww!.isSupported.value).toBeFalsy();
    expect(ww!.worker.value).toBeUndefined();
    // post / terminate must not throw when unsupported
    expect(() => ww!.post('x')).not.toThrow();
    expect(() => ww!.terminate()).not.toThrow();
    scope.stop();
  });

  it('constructs a worker from a URL string and forwards workerOptions', () => {
    const { window, WorkerCtor } = stubWindow();
    const workerOptions = { type: 'module' as const };
    const scope = effectScope();
    scope.run(() => {
      useWebWorker('/worker.js', { window, workerOptions });
    });
    expect(WorkerCtor).toHaveBeenCalledWith('/worker.js', workerOptions);
    scope.stop();
  });

  it('accepts a factory function returning a Worker', () => {
    const { window } = stubWindow();
    const instance = new FakeWorker();
    const factory = vi.fn(() => instance as unknown as Worker);
    const scope = effectScope();
    let ww: UseWebWorkerReturn;
    scope.run(() => {
      ww = useWebWorker(factory, { window });
    });
    expect(factory).toHaveBeenCalledOnce();
    expect(ww!.worker.value).toBe(instance);
    scope.stop();
  });

  it('accepts an existing Worker instance directly', () => {
    const { window } = stubWindow();
    const instance = new FakeWorker();
    const scope = effectScope();
    let ww: UseWebWorkerReturn;
    scope.run(() => {
      ww = useWebWorker(instance as unknown as Worker, { window });
    });
    expect(ww!.worker.value).toBe(instance);
    scope.stop();
  });

  it('updates data and calls onMessage when the worker posts a message', () => {
    const { window, created } = stubWindow();
    const onMessage = vi.fn();
    const scope = effectScope();
    let ww: UseWebWorkerReturn<{ value: number }>;
    scope.run(() => {
      ww = useWebWorker<{ value: number }>('/worker.js', { window, onMessage });
    });

    created[0]!.emit('message', { data: { value: 42 } });
    expect(onMessage).toHaveBeenCalledOnce();
    expect(ww!.data.value).toEqual({ value: 42 });
    scope.stop();
  });

  it('post forwards arguments to the worker', () => {
    const { window, created } = stubWindow();
    const scope = effectScope();
    let ww: UseWebWorkerReturn;
    scope.run(() => {
      ww = useWebWorker('/worker.js', { window });
    });

    const transfer: Transferable[] = [];
    ww!.post({ cmd: 'run' }, transfer);
    expect(created[0]!.postMessage).toHaveBeenCalledWith({ cmd: 'run' }, transfer);
    scope.stop();
  });

  it('invokes onError on messageerror and error events', () => {
    const { window, created } = stubWindow();
    const onError = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      useWebWorker('/worker.js', { window, onError });
    });

    created[0]!.emit('messageerror', { type: 'messageerror' });
    created[0]!.emit('error', { type: 'error' });
    expect(onError).toHaveBeenCalledTimes(2);
    scope.stop();
  });

  it('terminate stops the worker and clears the reference', () => {
    const { window, created } = stubWindow();
    const scope = effectScope();
    let ww: UseWebWorkerReturn;
    scope.run(() => {
      ww = useWebWorker('/worker.js', { window });
    });

    ww!.terminate();
    expect(created[0]!.terminate).toHaveBeenCalledOnce();
    expect(ww!.worker.value).toBeUndefined();
    scope.stop();
  });

  it('terminates the worker automatically when the scope is disposed', () => {
    const { window, created } = stubWindow();
    const scope = effectScope();
    scope.run(() => {
      useWebWorker('/worker.js', { window });
    });

    scope.stop();
    expect(created[0]!.terminate).toHaveBeenCalledOnce();
  });
});
