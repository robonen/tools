import { ref, shallowRef, watch, toValue, type Ref, type MaybeRefOrGetter } from 'vue';
import { isBoolean, isNumber, isString, isObject, isMap, isSet, isDate } from '@robonen/stdlib';
import type { ConfigurableFlush } from '@/types';

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

export interface UseStorageOptions<T> extends ConfigurableFlush {
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
   * Write the default value to the storage when it does not exist
   * @default true
   */
  writeDefaults?: boolean;
  /**
   * Custom serializer for reading/writing storage values
   */
  serializer?: StorageSerializer<T>;
  /**
   * Merge the default value with the stored value
   * @default false
   */
  mergeDefaults?: boolean | ((stored: T, defaults: T) => T);
  /**
   * Error handler for read/write failures
   */
  onError?: (error: unknown) => void;
}

export type UseStorageReturn<T> = Ref<T>;

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
 * @param {string} key The storage key
 * @param {MaybeRefOrGetter<T>} initialValue The initial/default value
 * @param {StorageLike} storage The storage backend
 * @param {UseStorageOptions<T>} [options={}] Options
 * @returns {Ref<T>} A reactive ref synced with storage
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
export function useStorage<T extends string>(key: string, initialValue: MaybeRefOrGetter<T>, storage: StorageLike, options?: UseStorageOptions<T>): Ref<T>;
export function useStorage<T extends number>(key: string, initialValue: MaybeRefOrGetter<T>, storage: StorageLike, options?: UseStorageOptions<T>): Ref<T>;
export function useStorage<T extends boolean>(key: string, initialValue: MaybeRefOrGetter<T>, storage: StorageLike, options?: UseStorageOptions<T>): Ref<T>;
export function useStorage<T>(key: string, initialValue: MaybeRefOrGetter<T>, storage: StorageLike, options?: UseStorageOptions<T>): Ref<T>;
export function useStorage<T = unknown>(key: string, initialValue: MaybeRefOrGetter<null>, storage: StorageLike, options?: UseStorageOptions<T>): Ref<T>;
export function useStorage<T>(
  key: string,
  initialValue: MaybeRefOrGetter<T>,
  storage: StorageLike,
  options: UseStorageOptions<T> = {},
): Ref<T> {
  const {
    shallow = true,
    deep = true,
    flush = 'pre',
    writeDefaults = true,
    mergeDefaults = false,
    onError = console.error,
  } = options;

  const defaults = toValue(initialValue);
  const serializer = options.serializer ?? guessSerializer(defaults);

  const data = (shallow ? shallowRef : ref)(defaults) as Ref<T>;

  function read(): T {
    const raw = storage.getItem(key);

    if (raw == null) {
      if (writeDefaults && defaults != null) {
        try {
          storage.setItem(key, serializer.write(defaults));
        } catch (e) {
          onError(e);
        }
      }

      return defaults;
    }

    try {
      let value = serializer.read(raw);

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

  function write(value: T) {
    try {
      const oldValue = storage.getItem(key);

      if (value == null) {
        storage.removeItem(key);
      } else {
        const serialized = serializer.write(value);

        if (oldValue !== serialized)
          storage.setItem(key, serialized);
      }
    } catch (e) {
      onError(e);
    }
  }

  function update() {
    pauseWatch();

    try {
      data.value = read();
    } catch (e) {
      onError(e);
    } finally {
      resumeWatch();
    }
  }

  const { pause: pauseWatch, resume: resumeWatch } = watch(data, (newValue) => {
    write(newValue);
  }, { flush, deep });

  update();

  return data;
}
