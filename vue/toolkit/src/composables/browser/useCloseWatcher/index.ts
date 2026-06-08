import type { VoidFunction } from '@robonen/stdlib';
import { noop } from '@robonen/stdlib';
import type { Ref } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { useEventListener } from '@/composables/browser/useEventListener';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

/**
 * Subset of the native `CloseWatcher` instance surface we rely on.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CloseWatcher
 */
interface CloseWatcherInstance {
  requestClose: () => void;
  close: () => void;
  destroy: () => void;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  removeEventListener: (type: string, listener: (event: Event) => void) => void;
  oncancel: ((event: Event) => void) | null;
  onclose: ((event: Event) => void) | null;
}

type CloseWatcherConstructor = new (options?: { signal?: AbortSignal }) => CloseWatcherInstance;

/**
 * Handler invoked when a close request is received.
 *
 * The argument is the native `close` event when the platform `CloseWatcher`
 * is used, or the `Escape` `KeyboardEvent` when falling back to keydown.
 */
export type CloseWatcherHandler = (event: Event) => void;

export interface UseCloseWatcherOptions extends ConfigurableWindow {}

export interface UseCloseWatcherReturn {
  /**
   * Whether the native `CloseWatcher` API is available.
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * Register a handler for close requests (Esc key / Android back / `close()`).
   *
   * @returns A stop handle that removes this handler.
   */
  onClose: (handler: CloseWatcherHandler) => VoidFunction;

  /**
   * Request a close, firing every registered handler.
   */
  close: VoidFunction;

  /**
   * Tear down the watcher and remove all registered handlers.
   */
  destroy: VoidFunction;
}

/**
 * @name useCloseWatcher
 * @category Browser
 * @description Wrap the native `CloseWatcher` API to handle close requests
 * (the `Esc` key or the Android back gesture). Falls back to listening for
 * `Escape` keydown when `CloseWatcher` is unavailable. SSR-safe.
 *
 * @param {UseCloseWatcherOptions} [options={}] Configuration options
 * @returns {UseCloseWatcherReturn} `isSupported`, `onClose`, `close`, and `destroy`
 *
 * @example
 * const { onClose, close, isSupported } = useCloseWatcher();
 * onClose(() => { dialogOpen.value = false; });
 *
 * @example
 * // Programmatically request a close
 * close();
 *
 * @since 0.0.15
 */
export function useCloseWatcher(options: UseCloseWatcherOptions = {}): UseCloseWatcherReturn {
  const { window = defaultWindow } = options;

  const isSupported = useSupported(() => !!window && 'CloseWatcher' in window);

  const handlers = new Set<CloseWatcherHandler>();
  let watcher: CloseWatcherInstance | undefined;
  let stopFallback: VoidFunction = noop;

  const dispatch = (event: Event): void => {
    // Snapshot so a handler that calls destroy()/onClose() can't mutate mid-loop
    // eslint-disable-next-line unicorn/no-useless-spread
    for (const handler of [...handlers])
      handler(event);
  };

  const teardownWatcher = (): void => {
    watcher?.destroy();
    watcher = undefined;
    stopFallback();
    stopFallback = noop;
  };

  const ensureWatcher = (): void => {
    if (!window)
      return;

    if (isSupported.value) {
      if (watcher)
        return;

      const CloseWatcherCtor = (window as unknown as { CloseWatcher: CloseWatcherConstructor }).CloseWatcher;
      watcher = new CloseWatcherCtor();
      // The native watcher deactivates after a single close; recreate it so the
      // returned `close()`/Esc keep working across multiple close requests.
      watcher.addEventListener('close', (event: Event) => {
        watcher = undefined;
        dispatch(event);
        ensureWatcher();
      });
      return;
    }

    // Fallback: only one keydown listener regardless of handler count
    if (stopFallback !== noop)
      return;

    stopFallback = useEventListener(
      window,
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key === 'Escape')
          dispatch(event);
      },
      { passive: true },
    );
  };

  const onClose = (handler: CloseWatcherHandler): VoidFunction => {
    handlers.add(handler);
    ensureWatcher();

    return () => {
      handlers.delete(handler);
    };
  };

  const close = (): void => {
    if (!window)
      return;

    if (watcher) {
      watcher.requestClose();
      return;
    }

    // No active native watcher (unsupported, torn down, or none registered yet):
    // synthesize a close event so handlers still fire.
    dispatch(new Event('close'));
  };

  const destroy = (): void => {
    handlers.clear();
    teardownWatcher();
  };

  tryOnScopeDispose(destroy);

  return {
    isSupported,
    onClose,
    close,
    destroy,
  };
}
