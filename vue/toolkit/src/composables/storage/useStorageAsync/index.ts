import { computed, ref, shallowRef, watch, toValue } from 'vue';
import type { Ref, ShallowRef, MaybeRefOrGetter, UnwrapRef } from 'vue';
import type { ConfigurableFlush, ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import type { ConfigurableEventFilter, EventFilter } from '@/utils/filters';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { useEventListener } from '@/composables/browser/useEventListener';
import { guessSerializer, shallowMerge } from '../useStorage';
import type { StorageEventLike } from '../useStorage';

export interface StorageSerializerAsync<T> {
  read: (raw: string) => T | Promise<T>;
  write: (value: T) => string | Promise<string>;
}

export interface StorageLikeAsync {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export interface UseStorageAsyncOptions<T, Shallow extends boolean = true> extends ConfigurableFlush, ConfigurableWindow, ConfigurableEventFilter {
  /**
   * Use shallowRef instead of ref for the internal state
   * @default true
   */
  shallow?: Shallow;
  /**
   * Watch for deep changes
   * @default true
   */
  deep?: boolean;
  /**
   * Listen to storage changes from other tabs/windows
   * @default true
   */
  listenToStorageChanges?: boolean;
  /**
   * Write the default value to the storage when it does not exist
   * @default true
   */
  writeDefaults?: boolean;
  /**
   * Custom serializer for reading/writing storage values
   */
  serializer?: StorageSerializerAsync<T>;
  /**
   * Merge the default value with the stored value
   * @default false
   */
  mergeDefaults?: boolean | ((stored: T, defaults: T) => T);
  /**
   * Called once when the initial value has been loaded from storage
   */
  onReady?: (value: T) => void;
  /**
   * Error handler for read/write failures
   */
  onError?: (error: unknown) => void;
  /**
   * Wait for the component to be mounted before reading the storage
   *
   * Useful for SSR hydration to prevent mismatch
   * @default false
   */
  initOnMounted?: boolean;
}

export interface UseStorageAsyncReturnBase<T, Shallow extends boolean> {
  state: Shallow extends true ? ShallowRef<T> : Ref<UnwrapRef<T>>;
  isReady: Ref<boolean>;
}

export type UseStorageAsyncReturn<T, Shallow extends boolean>
  = & UseStorageAsyncReturnBase<T, Shallow>
    & PromiseLike<UseStorageAsyncReturnBase<T, Shallow>>;

/**
 * @name useStorageAsync
 * @category Storage
 * @description Reactive Storage binding with async support — creates a ref synced with an async storage backend
 *
 * @param {MaybeRefOrGetter<string>} key The storage key (can be reactive)
 * @param {MaybeRefOrGetter<T>} initialValue The initial/default value
 * @param {StorageLikeAsync} storage The async storage backend
 * @param {UseStorageAsyncOptions<T>} [options={}] Options
 * @returns {UseStorageAsyncReturn<T, Shallow>} An object with state ref and isReady flag, also awaitable
 *
 * @example
 * const { state } = useStorageAsync('access-token', '', asyncStorage);
 *
 * @example
 * const { state, isReady } = await useStorageAsync('settings', { theme: 'dark' }, asyncStorage);
 *
 * @example
 * const { state } = useStorageAsync('key', 'default', asyncStorage, {
 *   onReady: (value) => console.log('Loaded:', value),
 * });
 *
 * @since 0.0.12
 */
export function useStorageAsync<T extends string, Shallow extends boolean = true>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T extends number, Shallow extends boolean = true>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T extends boolean, Shallow extends boolean = true>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T, Shallow extends boolean = true>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T = unknown, Shallow extends boolean = true>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<null>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T, Shallow extends boolean = true>(
  key: MaybeRefOrGetter<string>,
  initialValue: MaybeRefOrGetter<T>,
  storage: StorageLikeAsync,
  options: UseStorageAsyncOptions<T, Shallow> = {},
): UseStorageAsyncReturn<T, Shallow> {
  const {
    shallow = true,
    deep = true,
    flush = 'pre',
    writeDefaults = true,
    mergeDefaults = false,
    listenToStorageChanges = true,
    window = defaultWindow,
    eventFilter,
    initOnMounted = false,
    onReady,
    onError = console.error, // eslint-disable-line no-console
  } = options;

  const defaults = toValue(initialValue);
  const serializer = options.serializer ?? guessSerializer(defaults);

  const state = (shallow ? shallowRef : ref)(defaults) as Shallow extends true ? ShallowRef<T> : Ref<UnwrapRef<T>>;
  const isReady = ref(false);
  const keyComputed = computed<string>(() => toValue(key));

  async function read(event?: StorageEventLike): Promise<T> {
    try {
      const rawValue = event
        ? event.newValue
        : await storage.getItem(keyComputed.value);

      if (rawValue === undefined || rawValue === null) {
        if (writeDefaults && defaults !== undefined && defaults !== null) {
          try {
            await storage.setItem(keyComputed.value, await serializer.write(defaults));
          }
          catch (e) {
            onError(e);
          }
        }

        return defaults;
      }

      if (!event && mergeDefaults) {
        const value: T = await serializer.read(rawValue) as T;

        return typeof mergeDefaults === 'function'
          ? mergeDefaults(value, defaults)
          : shallowMerge(value, defaults);
      }

      return await serializer.read(rawValue) as T;
    }
    catch (e) {
      onError(e);
      return defaults;
    }
  }

  async function write(value: T) {
    try {
      if (value === undefined || value === null) {
        await storage.removeItem(keyComputed.value);
      }
      else {
        const raw = await serializer.write(value);
        await storage.setItem(keyComputed.value, raw);
      }
    }
    catch (e) {
      onError(e);
    }
  }

  // Apply event filter if provided
  const writeWithFilter: (value: T) => void = eventFilter
    ? (value: T) => (eventFilter as EventFilter)(() => write(value))
    : (value: T) => { write(value); };

  let stopWatch: (() => void) | null = null;
  let stopKeyWatch: (() => void) | null = null;

  tryOnScopeDispose(() => {
    stopWatch?.();
    stopKeyWatch?.();
  });

  // Event listeners for cross-tab synchronization
  let firstMounted = false;

  if (window && listenToStorageChanges) {
    useEventListener(window, 'storage', (ev: StorageEvent) => {
      if (initOnMounted && !firstMounted)
        return;
      if (ev.key !== keyComputed.value)
        return;
      if (ev.storageArea !== storage)
        return;

      Promise.resolve().then(() => read(ev)).then((value) => {
        (state as Ref).value = value;
      });
    }, { passive: true });
  }

  const shell: UseStorageAsyncReturnBase<T, Shallow> = {
    state,
    isReady,
  };

  function performInit() {
    return read().then((value) => {
      (state as Ref).value = value;
      isReady.value = true;
      onReady?.(value);

      // Set up watcher AFTER initial state is set — avoids write-back on init
      const stop = watch(state, (newValue) => {
        writeWithFilter(newValue as T);
      }, { flush, deep });

      stopWatch = stop;

      // Watch for key changes
      stopKeyWatch = watch(keyComputed, () => {
        read().then((v) => {
          (state as Ref).value = v;
        });
      }, { flush });

      return shell;
    });
  }

  let readyPromise: Promise<UseStorageAsyncReturnBase<T, Shallow>>;

  if (initOnMounted) {
    readyPromise = new Promise<UseStorageAsyncReturnBase<T, Shallow>>((resolve) => {
      tryOnMounted(() => {
        firstMounted = true;
        performInit().then(resolve);
      });
    });
  }
  else {
    readyPromise = performInit();
  }

  return {
    ...shell,
    // eslint-disable-next-line unicorn/no-thenable
    then(onFulfilled, onRejected) {
      return readyPromise.then(onFulfilled, onRejected);
    },
  };
}
