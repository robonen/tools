import { ref, shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { RemovableRef } from '@/types';
import { defaultWindow } from '@/types';
import { useStorage } from '../useStorage';
import type { UseStorageOptions } from '../useStorage';

/**
 * @name useSessionStorage
 * @category Storage
 * @description Reactive sessionStorage binding — creates a ref synced with `window.sessionStorage`
 *
 * @param {MaybeRefOrGetter<string>} key The storage key (can be reactive)
 * @param {MaybeRefOrGetter<T>} initialValue The initial/default value
 * @param {UseStorageOptions<T>} [options={}] Options
 * @returns {RemovableRef<T>} A reactive ref synced with sessionStorage
 *
 * @example
 * const count = useSessionStorage('my-count', 0);
 *
 * @example
 * const state = useSessionStorage('my-state', { hello: 'world' });
 *
 * @since 0.0.12
 */
export function useSessionStorage<T extends string>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useSessionStorage<T extends number>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useSessionStorage<T extends boolean>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useSessionStorage<T>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useSessionStorage<T = unknown>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<null>, options?: UseStorageOptions<T>): RemovableRef<T>;
export function useSessionStorage<T>(
  key: MaybeRefOrGetter<string>,
  initialValue: MaybeRefOrGetter<T>,
  options: UseStorageOptions<T> = {},
): RemovableRef<T> {
  const window = options.window ?? defaultWindow;
  const storage = window?.sessionStorage;

  if (!storage) {
    // SSR / non-browser environment: return an in-memory ref
    return (options.shallow !== false ? shallowRef : ref)(toValue(initialValue)) as RemovableRef<T>;
  }

  return useStorage(key, initialValue, storage, { ...options, window });
}
