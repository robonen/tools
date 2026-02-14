import type { MaybeRefOrGetter, Ref } from 'vue';
import { defaultWindow } from '@/types';
import { VueToolsError } from '@/utils/error';
import { useStorage } from '../useStorage';
import type { UseStorageOptions } from '../useStorage';

/**
 * @name useSessionStorage
 * @category Storage
 * @description Reactive sessionStorage binding — creates a ref synced with `window.sessionStorage`
 *
 * @param {string} key The storage key
 * @param {MaybeRefOrGetter<T>} initialValue The initial/default value
 * @param {UseStorageOptions<T>} [options={}] Options
 * @returns {Ref<T>} A reactive ref synced with sessionStorage
 *
 * @example
 * const count = useSessionStorage('my-count', 0);
 *
 * @example
 * const state = useSessionStorage('my-state', { hello: 'world' });
 *
 * @since 0.0.12
 */
export function useSessionStorage<T extends string>(key: string, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): Ref<T>;
export function useSessionStorage<T extends number>(key: string, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): Ref<T>;
export function useSessionStorage<T extends boolean>(key: string, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): Ref<T>;
export function useSessionStorage<T>(key: string, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): Ref<T>;
export function useSessionStorage<T = unknown>(key: string, initialValue: MaybeRefOrGetter<null>, options?: UseStorageOptions<T>): Ref<T>;
export function useSessionStorage<T>(
  key: string,
  initialValue: MaybeRefOrGetter<T>,
  options: UseStorageOptions<T> = {},
): Ref<T> {
  const storage = defaultWindow?.sessionStorage;

  if (!storage)
    throw new VueToolsError('useSessionStorage: sessionStorage is not available');

  return useStorage(key, initialValue, storage, options);
}
