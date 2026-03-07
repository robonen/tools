import { nextTick, ref, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { isBoolean, isNumber, isString, isObject, isMap, isSet, isDate } from '@robonen/stdlib';
import type { ConfigurableFlush, ConfigurableWindow, RemovableRef } from '@/types';
import { defaultWindow } from '@/types';
import type { ConfigurableEventFilter, EventFilter } from '@/utils/filters';
import { useEventListener } from '@/composables/browser/useEventListener';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';

export interface StorageSerializer<T> {
  read: (raw: string) => T;
  write: (value: T) => string;
}

export const StorageSerializers: { [K: string]: StorageSerializer<any> } & {
  boolean: StorageSerializer<boolean>;
  number: StorageSerializer<number>;
  string: StorageSerializer<string>;
  object: StorageSerializer<any>;
  map: StorageSerializer<Map<any, any>>;
  set: StorageSerializer<Set<any>>;
  date: StorageSerializer<Date>;
} = {
  boolean: {
    read: (v: string) => v === 'true',
    write: (v: boolean) => String(v),
  },
  number: {
    read: (v: string) => Number.parseFloat(v),
    write: (v: number) => String(v),
  },
  string: {
    read: (v: string) => v,
    write: (v: string) => v,
  },
  object: {
    read: (v: string) => JSON.parse(v),
    write: (v: any) => JSON.stringify(v),
  },
  map: {
    read: (v: string) => new Map(JSON.parse(v)),
    write: (v: Map<any, any>) => JSON.stringify([...v.entries()]),
  },
  set: {
    read: (v: string) => new Set(JSON.parse(v)),
    write: (v: Set<any>) => JSON.stringify([...v]),
  },
  date: {
    read: (v: string) => new Date(v),
    write: (v: Date) => v.toISOString(),
  },
};

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export const customStorageEventName = 'vuetools-storage';

export interface StorageEventLike {
  storageArea: StorageLike | null;
  key: StorageEvent['key'];
  oldValue: StorageEvent['oldValue'];
  newValue: StorageEvent['newValue'];
}

export interface UseStorageOptions<T> extends ConfigurableFlush, ConfigurableWindow, ConfigurableEventFilter {
  /**
   * Use shallowRef instead of ref for the internal state
   * @default true
   */
  shallow?: boolean;
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
   * Merge the default value with the stored value
   * @default false
   */
  mergeDefaults?: boolean | ((stored: T, defaults: T) => T);
  /**
   * Custom serializer for reading/writing storage values
   */
  serializer?: StorageSerializer<T>;
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

export type UseStorageReturn<T> = RemovableRef<T>;

export function guessSerializer<T>(value: T): StorageSerializer<T> {
  if (isBoolean(value)) return StorageSerializers.boolean as any;
  if (isNumber(value)) return StorageSerializers.number as any;
  if (isString(value)) return StorageSerializers.string as any;
  if (isMap(value)) return StorageSerializers.map as any;
  if (isSet(value)) return StorageSerializers.set as any;
  if (isDate(value)) return StorageSerializers.date as any;
  if (isObject(value)) return StorageSerializers.object as any;

  return StorageSerializers.object as any;
}

export function shallowMerge<T>(stored: T, defaults: T): T {
  if (isObject(stored) && isObject(defaults))
    return { ...defaults, ...stored };

  return stored;
}

/**
 * @name useStorage
 * @category Storage
 * @description Reactive Storage binding — creates a ref synced with a storage backend
 *
 * @param {MaybeRefOrGetter<string>} key The storage key (can be reactive)
 * @param {MaybeRefOrGetter<T>} initialValue The initial/default value
 * @param {StorageLike} storage The storage backend
 * @param {UseStorageOptions<T>} [options={}] Options
 * @returns {RemovableRef<T>} A reactive ref synced with storage
 *
 * @example
 * const count = useStorage('my-count', 0, storage);
 *
 * @example
 * const state = useStorage('my-state', { hello: 'world' }, storage);
 *
 * @example
 * const id = useStorage('my-id', 'default', storage, {
 *   serializer: { read: (v) => v, write: (v) => v },
 * });
 *
 * @since 0.0.12
 */
export function useStorage<T extends string>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLike, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useStorage<T extends number>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLike, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useStorage<T extends boolean>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLike, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useStorage<T>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLike, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useStorage<T = unknown>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<null>, storage: StorageLike, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useStorage<T>(
  key: MaybeRefOrGetter<string>,
  initialValue: MaybeRefOrGetter<T>,
  storage: StorageLike,
  options: UseStorageOptions<T> = {},
): RemovableRef<T> {
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
    onError = console.error, // eslint-disable-line no-console
  } = options;

  const defaults = toValue(initialValue);
  const serializer = options.serializer ?? guessSerializer(defaults);

  const data = (shallow ? shallowRef : ref)(defaults) as RemovableRef<T>;
  const resolvedKey = () => toValue(key);

  function read(event?: StorageEventLike): T {
    const rawValue = event
      ? event.newValue
      : storage.getItem(resolvedKey());

    if (rawValue === undefined || rawValue === null) {
      if (writeDefaults && defaults !== undefined && defaults !== null) {
        try {
          storage.setItem(resolvedKey(), serializer.write(defaults));
        }
        catch (e) {
          onError(e);
        }
      }

      return defaults;
    }

    try {
      if (!event && mergeDefaults) {
        const value = serializer.read(rawValue);

        return typeof mergeDefaults === 'function'
          ? mergeDefaults(value, defaults)
          : shallowMerge(value, defaults);
      }

      return serializer.read(rawValue);
    }
    catch (e) {
      onError(e);
      return defaults;
    }
  }

  function dispatchWriteEvent(oldValue: string | null, newValue: string | null) {
    if (!window)
      return;

    const payload = {
      key: resolvedKey(),
      oldValue,
      newValue,
      storageArea: storage as Storage,
    };

    // Use native StorageEvent for built-in Storage, CustomEvent for custom backends
    window.dispatchEvent(
      storage instanceof Storage
        ? new StorageEvent('storage', payload)
        : new CustomEvent<StorageEventLike>(customStorageEventName, { detail: payload }),
    );
  }

  function write(value: T) {
    try {
      const oldValue = storage.getItem(resolvedKey());

      if (value === undefined || value === null) {
        dispatchWriteEvent(oldValue, null);
        storage.removeItem(resolvedKey());
      }
      else {
        const serialized = serializer.write(value);

        if (oldValue !== serialized) {
          storage.setItem(resolvedKey(), serialized);
          dispatchWriteEvent(oldValue, serialized);
        }
      }
    }
    catch (e) {
      onError(e);
    }
  }

  // Write-lock prevents the data watcher from writing back to storage
  // when data.value is being updated programmatically (from storage reads,
  // key changes, or cross-tab events). The lock is released via nextTick
  // so it persists through the pre-flush watcher cycle.
  let writeLock = false;

  function lockWritesUntilFlush() {
    writeLock = true;
    nextTick(() => {
      writeLock = false;
    });
  }

  function update(event: StorageEventLike) {
    if (event.storageArea !== storage)
      return;

    if (event.key === null) {
      lockWritesUntilFlush();
      data.value = defaults;
      return;
    }

    if (event.key !== resolvedKey())
      return;

    const currentSerialized = serializer.write(data.value);

    if (event.newValue !== currentSerialized) {
      lockWritesUntilFlush();
      data.value = read(event);
    }
  }

  function updateFromCustomEvent(event: CustomEvent<StorageEventLike>) {
    update(event.detail);
  }

  // Apply event filter if provided
  const writeWithFilter: (value: T) => void = eventFilter
    ? (value: T) => (eventFilter as EventFilter)(() => write(value))
    : write;

  // Initialize data from storage BEFORE creating watchers to avoid
  // Vue 3.5 pause/resume replay race conditions
  if (!initOnMounted) {
    data.value = read();
  }

  // Data write watcher — skips writes when writeLock is active
  watch(data, (newValue) => {
    if (writeLock)
      return;

    writeWithFilter(newValue);
  }, { flush, deep });

  // Watch for reactive key changes
  if (typeof key !== 'string') {
    watch(resolvedKey, () => {
      lockWritesUntilFlush();
      data.value = read();
    });
  }

  // Event listeners for cross-tab synchronization
  let firstMounted = false;

  const onStorageEvent = (ev: StorageEvent): void => {
    if (initOnMounted && !firstMounted)
      return;

    update(ev);
  };

  const onStorageCustomEvent = (ev: CustomEvent<StorageEventLike>): void => {
    if (initOnMounted && !firstMounted)
      return;

    updateFromCustomEvent(ev);
  };

  if (window && listenToStorageChanges) {
    if (storage instanceof Storage)
      useEventListener(window, 'storage', onStorageEvent, { passive: true });
    else
      useEventListener(window as any, customStorageEventName as any, onStorageCustomEvent as any);
  }

  if (initOnMounted) {
    tryOnMounted(() => {
      firstMounted = true;
      lockWritesUntilFlush();
      data.value = read();
    });
  }

  return data;
}
