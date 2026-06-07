import { shallowReadonly, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseObjectUrlOptions extends ConfigurableWindow {}

export type UseObjectUrlReturn = Readonly<ShallowRef<string | undefined>>;

/**
 * @name useObjectUrl
 * @category Browser
 * @description Create and auto-revoke an object URL for a `Blob`, `File`, or `MediaSource`. The previous URL is revoked whenever the source changes, and the active URL is revoked on scope dispose.
 *
 * @param {MaybeRefOrGetter<Blob | MediaSource | null | undefined>} object The reactive source to create an object URL for
 * @param {UseObjectUrlOptions} [options={}] Options
 * @returns {UseObjectUrlReturn} A read-only ref holding the current object URL, or `undefined` when there is no source (or in unsupported/SSR environments)
 *
 * @example
 * const file = shallowRef<File>();
 * const url = useObjectUrl(file);
 *
 * @since 0.0.15
 */
export function useObjectUrl(
  object: MaybeRefOrGetter<Blob | MediaSource | null | undefined>,
  options: UseObjectUrlOptions = {},
): UseObjectUrlReturn {
  const { window = defaultWindow } = options;

  const url = shallowRef<string | undefined>();

  const release = (): void => {
    if (url.value)
      (window as (Window & typeof globalThis) | undefined)?.URL.revokeObjectURL(url.value);

    url.value = undefined;
  };

  watch(
    () => toValue(object),
    (newObject) => {
      release();

      if (newObject && window)
        url.value = (window as Window & typeof globalThis).URL.createObjectURL(newObject);
    },
    { immediate: true },
  );

  tryOnScopeDispose(release);

  return shallowReadonly(url);
}
