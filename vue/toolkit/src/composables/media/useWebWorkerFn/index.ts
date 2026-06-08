import type { AnyFunction } from '@robonen/stdlib';
import { noop } from '@robonen/stdlib';
import { shallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import type { ShallowRef } from 'vue';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export type WebWorkerStatus
  = | 'PENDING'
    | 'RUNNING'
    | 'SUCCESS'
    | 'ERROR'
    | 'TIMEOUT_EXPIRED';

export interface UseWebWorkerFnOptions extends ConfigurableWindow {
  /**
   * External script URLs to load inside the worker via `importScripts`.
   *
   * @default []
   */
  dependencies?: string[];

  /**
   * Local functions to inline into the worker scope so `workerFn` can call them.
   *
   * @default []
   */
  localDependencies?: AnyFunction[];

  /**
   * Milliseconds before the worker is terminated with a `TIMEOUT_EXPIRED` status.
   * When omitted, the worker runs until it resolves or errors.
   */
  timeout?: number;

  /**
   * Called when the worker errors or its run is terminated abnormally.
   *
   * @default noop
   */
  onError?: (error: unknown) => void;
}

export interface UseWebWorkerFnReturn<T extends AnyFunction> {
  /**
   * Run `fn` in a transient worker. Resolves with its return value,
   * rejects on error or timeout. Only one run may be active at a time.
   */
  workerFn: (...args: Parameters<T>) => Promise<ReturnType<T>>;

  /**
   * Reactive status of the current worker run.
   */
  workerStatus: ShallowRef<WebWorkerStatus>;

  /**
   * Terminate the active worker and reset to the given status.
   */
  workerTerminate: (status?: WebWorkerStatus) => void;

  /**
   * Whether `Worker`, `Blob` and `URL.createObjectURL` are available (SSR-safe).
   */
  isSupported: ShallowRef<boolean>;
}

type WorkerWithUrl = Worker & { _objectUrl?: string };

interface WorkerRunHandlers<T extends AnyFunction> {
  resolve: (result: ReturnType<T>) => void;
  reject: (reason: unknown) => void;
}

/**
 * Builds the worker bootstrap source: inlines external `importScripts`,
 * local dependencies, the user function and a message-driven job runner.
 */
function createWorkerBlobUrl(
  fn: AnyFunction,
  dependencies: string[],
  localDependencies: AnyFunction[],
  createUrl: typeof URL.createObjectURL,
): string {
  const importScriptsString = dependencies.length
    ? `importScripts(${dependencies.map(dep => `'${dep}'`).join(',')});`
    : '';

  const localDependenciesString = localDependencies
    .filter(dep => typeof dep === 'function')
    .map((dep) => {
      const source = dep.toString();
      return source.trim().startsWith('function') ? source : `const ${dep.name} = ${source}`;
    })
    .join(';');

  const blobCode = `${importScriptsString}${localDependenciesString};`
    + `onmessage=function(e){`
    + `Promise.resolve((${fn.toString()}).apply(undefined,e.data[0]))`
    + `.then(function(result){postMessage(['SUCCESS',result])})`
    + `.catch(function(error){postMessage(['ERROR',error])})`
    + `}`;

  const blob = new Blob([blobCode], { type: 'application/javascript' });
  return createUrl(blob);
}

/**
 * @name useWebWorkerFn
 * @category Media
 * @description Run an expensive function in a transient Web Worker off the main thread
 *
 * @param {Function} fn The function to execute inside the worker (must be self-contained or rely on `dependencies`/`localDependencies`)
 * @param {UseWebWorkerFnOptions} [options] Worker dependencies, timeout and error hook
 * @returns {UseWebWorkerFnReturn} `{ workerFn, workerStatus, workerTerminate, isSupported }`
 *
 * @example
 * const { workerFn, workerStatus } = useWebWorkerFn((n: number) => {
 *   let sum = 0;
 *   for (let i = 0; i < n; i++) sum += i;
 *   return sum;
 * });
 * const total = await workerFn(1e9);
 *
 * @example
 * const { workerFn } = useWebWorkerFn(dates => dayjs(dates[0]).isBefore(dates[1]), {
 *   dependencies: ['https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js'],
 *   timeout: 5000,
 * });
 *
 * @since 0.0.15
 */
export function useWebWorkerFn<T extends AnyFunction>(
  fn: T,
  options: UseWebWorkerFnOptions = {},
): UseWebWorkerFnReturn<T> {
  const {
    dependencies = [],
    localDependencies = [],
    timeout,
    window = defaultWindow,
    onError = noop,
  } = options;

  // `URL`/`Worker` are global constructors on `typeof globalThis`, not the `Window` interface.
  const globalWindow = window as (Window & typeof globalThis) | undefined;

  const isSupported = useSupported(() =>
    !!window && 'Worker' in window && 'Blob' in window && typeof globalWindow?.URL?.createObjectURL === 'function');

  const workerStatus = shallowRef<WebWorkerStatus>('PENDING');

  let worker: WorkerWithUrl | undefined;
  let handlers: WorkerRunHandlers<T> | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const workerTerminate = (status: WebWorkerStatus = 'PENDING'): void => {
    if (worker && window) {
      worker.terminate();
      if (worker._objectUrl)
        globalWindow!.URL.revokeObjectURL(worker._objectUrl);
    }

    if (timeoutId !== undefined && window) {
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    worker = undefined;
    handlers = undefined;
    workerStatus.value = status;
  };

  tryOnScopeDispose(workerTerminate);

  const generateWorker = (): WorkerWithUrl => {
    const objectUrl = createWorkerBlobUrl(fn, dependencies, localDependencies, globalWindow!.URL.createObjectURL.bind(globalWindow!.URL));
    const instance: WorkerWithUrl = new globalWindow!.Worker(objectUrl);
    instance._objectUrl = objectUrl;

    instance.onmessage = (event: MessageEvent) => {
      const [status, payload] = event.data as [WebWorkerStatus, ReturnType<T>];

      if (status === 'SUCCESS') {
        handlers?.resolve(payload);
        workerTerminate('SUCCESS');
        return;
      }

      onError(payload);
      handlers?.reject(payload);
      workerTerminate('ERROR');
    };

    instance.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      onError(event);
      handlers?.reject(event);
      workerTerminate('ERROR');
    };

    if (timeout !== undefined) {
      timeoutId = window!.setTimeout(() => {
        onError(new Error(`[useWebWorkerFn] Worker timed out after ${timeout}ms`));
        handlers?.reject(new Error('TIMEOUT_EXPIRED'));
        workerTerminate('TIMEOUT_EXPIRED');
      }, timeout);
    }

    return instance;
  };

  const workerFn = (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (!isSupported.value || !window)
      return Promise.reject(new Error('[useWebWorkerFn] Web Worker is not supported in this environment'));

    if (workerStatus.value === 'RUNNING')
      return Promise.reject(new Error('[useWebWorkerFn] Only one worker run may be active at a time'));

    return new Promise<ReturnType<T>>((resolve, reject) => {
      handlers = { resolve, reject };
      worker = generateWorker();
      workerStatus.value = 'RUNNING';
      worker.postMessage([[...args]]);
    });
  };

  return {
    workerFn,
    workerStatus,
    workerTerminate,
    isSupported,
  };
}
