import type { MaybeRefOrGetter, Ref } from 'vue';
import { defaultWindow } from '@/types';
import { VueToolsError } from '@/utils/error';
import { useStorage, type UseStorageOptions } from '../useStorage';

/**
 * @name useLocalStorage
 * @category Storage
 * @description Reactive localStorage binding — creates a ref synced with `window.localStorage`
 *
 * @param {string} key The storage key
 * @param {MaybeRefOrGetter<T>} initialValue The initial/default value
 * @param {UseStorageOptions<T>} [options={}] Options
 * @returns {Ref<T>} A reactive ref synced with localStorage
 *
 * @example
 * const count = useLocalStorage('my-count', 0);
 *
 * @example
 * const state = useLocalStorage('my-state', { hello: 'world' });
 *
 * @since 0.0.12
 */
export function useLocalStorage<T extends string>(key: string, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): Ref<T>;
export function useLocalStorage<T extends number>(key: string, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): Ref<T>;
export function useLocalStorage<T extends boolean>(key: string, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): Ref<T>;
export function useLocalStorage<T>(key: string, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): Ref<T>;
export function useLocalStorage<T = unknown>(key: string, initialValue: MaybeRefOrGetter<null>, options?: UseStorageOptions<T>): Ref<T>;
export function useLocalStorage<T>(
  key: string,
  initialValue: MaybeRefOrGetter<T>,
  options: UseStorageOptions<T> = {},
): Ref<T> {
  const storage = defaultWindow?.localStorage;

  if (!storage)
    throw new VueToolsError('useLocalStorage: localStorage is not available');

  return useStorage(key, initialValue, storage, options);
}
