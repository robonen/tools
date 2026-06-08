import type { AnyFunction, VoidFunction } from '@robonen/stdlib';
import { isFunction, isString, noop } from '@robonen/stdlib';
import { shallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import type { ShallowRef } from 'vue';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export type WebWorkerSource = string | URL | Worker | (() => Worker);

type WorkerPostMessage = (typeof Worker)['prototype']['postMessage'];

export interface UseWebWorkerOptions extends ConfigurableWindow {
  /**
   * Options forwarded to the `Worker` constructor when a URL string is passed
   */
  workerOptions?: WorkerOptions;

  /**
   * Called with the `MessageEvent` whenever the worker posts a message back.
   * Runs before `data` is updated.
   */
  onMessage?: (event: MessageEvent) => void;

  /**
   * Called when the worker fails to deserialize a message (`messageerror`)
   * or throws an uncaught error (`error`).
   *
   * @default noop
   */
  onError?: (event: ErrorEvent | MessageEvent) => void;
}

export interface UseWebWorkerReturn<Data = any> {
  /**
   * The latest data received from the worker via `postMessage`
   */
  data: ShallowRef<Data | null>;

  /**
   * Send a message to the worker. No-op when the worker is unavailable.
   */
  post: WorkerPostMessage;

  /**
   * Terminate the worker immediately and release the reference.
   */
  terminate: VoidFunction;

  /**
   * The underlying `Worker` instance, or `undefined` when unsupported / terminated.
   */
  worker: ShallowRef<Worker | undefined>;

  /**
   * Whether `Worker` is available in the current environment (SSR-safe).
   */
  isSupported: ShallowRef<boolean>;
}

/**
 * @name useWebWorker
 * @category Media
 * @description Simple Web Worker communication with reactive incoming data and automatic teardown
 *
 * @param {WebWorkerSource} source A `Worker` instance, a script URL/string, or a factory returning a `Worker`
 * @param {UseWebWorkerOptions} [options] Worker constructor options and message/error hooks
 * @returns {UseWebWorkerReturn} `{ data, post, terminate, worker, isSupported }`
 *
 * @example
 * const { data, post, terminate } = useWebWorker('/worker.js');
 * post({ type: 'start' });
 * watch(data, value => console.log(value));
 *
 * @example
 * const { data } = useWebWorker(() => new Worker(new URL('./worker.ts', import.meta.url)));
 *
 * @since 0.0.15
 */
export function useWebWorker<Data = any>(
  source: WebWorkerSource,
  options: UseWebWorkerOptions = {},
): UseWebWorkerReturn<Data> {
  const {
    window = defaultWindow,
    workerOptions,
    onMessage,
    onError = noop,
  } = options;

  const isSupported = useSupported(() => !!window && 'Worker' in window);
  const data = shallowRef<Data | null>(null);
  const worker = shallowRef<Worker | undefined>();

  const post = ((message: any, transfer?: any) => {
    if (worker.value)
      worker.value.postMessage(message, transfer);
  }) as WorkerPostMessage;

  const terminate: VoidFunction = () => {
    if (worker.value) {
      worker.value.terminate();
      worker.value = undefined;
    }
  };

  if (window && 'Worker' in window) {
    const WorkerCtor = (window as Window & { Worker: typeof Worker }).Worker;

    if (isString(source) || source instanceof URL)
      worker.value = new WorkerCtor(source, workerOptions);
    else if (isFunction(source))
      worker.value = (source as AnyFunction)();
    else
      worker.value = source;

    const instance = worker.value;

    if (instance) {
      useEventListener(instance, 'message', (event: MessageEvent) => {
        onMessage?.(event);
        data.value = event.data;
      }, { passive: true });

      useEventListener(instance, 'messageerror', (event: MessageEvent) => onError(event), { passive: true });
      useEventListener(instance, 'error', (event: ErrorEvent) => onError(event), { passive: true });
    }

    tryOnScopeDispose(terminate);
  }

  return {
    data,
    post,
    terminate,
    worker,
    isSupported,
  };
}
