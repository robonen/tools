import { ref, shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { RemovableRef } from '@/types';
import { defaultWindow } from '@/types';
import { useStorage } from '../useStorage';
import type { UseStorageOptions } from '../useStorage';

/**
 * @name useLocalStorage
 * @category Storage
 * @description Reactive localStorage binding — creates a ref synced with `window.localStorage`
 *
 * @param {MaybeRefOrGetter<string>} key The storage key (can be reactive)
 * @param {MaybeRefOrGetter<T>} initialValue The initial/default value
 * @param {UseStorageOptions<T>} [options={}] Options
 * @returns {RemovableRef<T>} A reactive ref synced with localStorage
 *
 * @example
 * const count = useLocalStorage('my-count', 0);
 *
 * @example
 * const state = useLocalStorage('my-state', { hello: 'world' });
 *
 * @since 0.0.12
 */
export function useLocalStorage<T extends string>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useLocalStorage<T extends number>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useLocalStorage<T extends boolean>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useLocalStorage<T>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useLocalStorage<T = unknown>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<null>, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useLocalStorage<T>(
  key: MaybeRefOrGetter<string>,
  initialValue: MaybeRefOrGetter<T>,
  options: UseStorageOptions<T> = {},
): RemovableRef<T> {
  const window = options.window ?? defaultWindow;
  const storage = window?.localStorage;

  if (!storage) {
    // SSR / non-browser environment: return an in-memory ref
    return (options.shallow !== false ? shallowRef : ref)(toValue(initialValue)) as RemovableRef<T>;
  }

  return useStorage(key, initialValue, storage, { ...options, window });
}
