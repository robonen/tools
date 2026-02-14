import { ref, shallowRef, watch, toValue } from 'vue';
import type { Ref, ShallowRef, MaybeRefOrGetter, UnwrapRef } from 'vue';
import type { ConfigurableFlush } from '@/types';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { guessSerializer, shallowMerge } from '../useStorage';

export interface StorageSerializerAsync<T> {
  read: (raw: string) => T | Promise<T>;
  write: (value: T) => string | Promise<string>;
}

export interface StorageLikeAsync {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export interface UseStorageAsyncOptions<T, Shallow extends boolean = true> extends ConfigurableFlush {
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
}

export interface UseStorageAsyncReturnBase<T, Shallow extends boolean> {
  state: Shallow extends true ? ShallowRef<T> : Ref<UnwrapRef<T>>;
  isReady: Ref<boolean>;
}

export type UseStorageAsyncReturn<T, Shallow extends boolean> =
  & UseStorageAsyncReturnBase<T, Shallow>
  & PromiseLike<UseStorageAsyncReturnBase<T, Shallow>>;

/**
 * @name useStorageAsync
 * @category Storage
 * @description Reactive Storage binding with async support — creates a ref synced with an async storage backend
 *
 * @param {string} key The storage key
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
export function useStorageAsync<T extends string, Shallow extends boolean = true>(key: string, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T extends number, Shallow extends boolean = true>(key: string, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T extends boolean, Shallow extends boolean = true>(key: string, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T, Shallow extends boolean = true>(key: string, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T = unknown, Shallow extends boolean = true>(key: string, initialValue: MaybeRefOrGetter<null>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T, Shallow extends boolean = true>(
  key: string,
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
    onReady,
    onError = console.error, // eslint-disable-line no-console
  } = options;

  const defaults = toValue(initialValue);
  const serializer = options.serializer ?? guessSerializer(defaults);

  const state = (shallow ? shallowRef : ref)(defaults) as Shallow extends true ? ShallowRef<T> : Ref<UnwrapRef<T>>;
  const isReady = ref(false);

  async function read(): Promise<T> {
    try {
      const raw = await storage.getItem(key);

      if (raw === undefined || raw === null) {
        if (writeDefaults && defaults !== undefined && defaults !== null) {
          try {
            await storage.setItem(key, await serializer.write(defaults));
          } catch (e) {
            onError(e);
          }
        }

        return defaults;
      }

      let value: T = await serializer.read(raw) as T;

      if (mergeDefaults) {
        value = typeof mergeDefaults === 'function'
          ? mergeDefaults(value, defaults)
          : shallowMerge(value, defaults);
      }

      return value;
    } catch (e) {
      onError(e);
      return defaults;
    }
  }

  async function write(value: T) {
    try {
      if (value === undefined || value === null) {
        await storage.removeItem(key);
      } else {
        const raw = await serializer.write(value);
        await storage.setItem(key, raw);
      }
    } catch (e) {
      onError(e);
    }
  }

  let stopWatch: (() => void) | null = null;

  tryOnScopeDispose(() => stopWatch?.());

  const shell: UseStorageAsyncReturnBase<T, Shallow> = {
    state,
    isReady,
  };

  const readyPromise: Promise<UseStorageAsyncReturnBase<T, Shallow>> = read().then((value) => {
    (state as Ref).value = value;
    isReady.value = true;
    onReady?.(value);

    // Set up watcher AFTER initial state is set — avoids write-back on init
    const stop = watch(state, (newValue) => {
      write(newValue as T);
    }, { flush, deep });

    stopWatch = stop;

    return shell;
  });

  return {
    ...shell,
    // eslint-disable-next-line unicorn/no-thenable
    then(onFulfilled, onRejected) {
      return readyPromise.then(onFulfilled, onRejected);
    },
  };
}
