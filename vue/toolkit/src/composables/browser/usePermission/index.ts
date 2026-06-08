import { shallowRef, toRaw } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import { isString } from '@robonen/stdlib';
import { defaultNavigator } from '@/types';
import type { ConfigurableNavigator } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { useEventListener } from '@/composables/browser/useEventListener';

/**
 * Permission names not yet present in the lib DOM `PermissionName` union but
 * supported by browsers behind the Permissions API.
 */
export type PermissionDescriptorNamePolyfill
  = | 'accelerometer'
    | 'accessibility-events'
    | 'ambient-light-sensor'
    | 'background-sync'
    | 'camera'
    | 'clipboard-read'
    | 'clipboard-write'
    | 'geolocation'
    | 'gyroscope'
    | 'local-fonts'
    | 'magnetometer'
    | 'microphone'
    | 'midi'
    | 'notifications'
    | 'payment-handler'
    | 'persistent-storage'
    | 'push'
    | 'screen-wake-lock'
    | 'speaker'
    | 'speaker-selection'
    | 'storage-access'
    | 'window-management';

export type GeneralPermissionDescriptor
  = | PermissionDescriptor
    | { name: PermissionDescriptorNamePolyfill };

export interface UsePermissionOptions<Controls extends boolean> extends ConfigurableNavigator {
  /**
   * Expose the `isSupported` flag and a `query` method that returns the raw `PermissionStatus`
   *
   * @default false
   */
  controls?: Controls;
}

export type UsePermissionReturn = Readonly<Ref<PermissionState | undefined>>;

export interface UsePermissionReturnWithControls {
  /**
   * Reactive permission state (`granted` | `denied` | `prompt`), or `undefined` while unsupported/unresolved
   */
  state: UsePermissionReturn;
  /**
   * Whether the Permissions API is available
   */
  isSupported: Readonly<Ref<boolean>>;
  /**
   * Query (or re-query) the permission, resolving to the raw `PermissionStatus`
   */
  query: () => Promise<PermissionStatus | undefined>;
}

/**
 * @name usePermission
 * @category Browser
 * @description Reactive Permissions API state.
 *
 * @param {GeneralPermissionDescriptor | string} permissionDesc The permission to query
 * @param {UsePermissionOptions} [options={}] Options
 * @returns {UsePermissionReturn | UsePermissionReturnWithControls} The permission state, or controls when `controls: true`
 *
 * @example
 * const microphone = usePermission('microphone');
 *
 * @example
 * const { state, isSupported, query } = usePermission('camera', { controls: true });
 *
 * @since 0.0.15
 */
export function usePermission(
  permissionDesc: GeneralPermissionDescriptor | GeneralPermissionDescriptor['name'],
  options?: UsePermissionOptions<false>,
): UsePermissionReturn;
export function usePermission(
  permissionDesc: GeneralPermissionDescriptor | GeneralPermissionDescriptor['name'],
  options: UsePermissionOptions<true>,
): UsePermissionReturnWithControls;
export function usePermission(
  permissionDesc: GeneralPermissionDescriptor | GeneralPermissionDescriptor['name'],
  options: UsePermissionOptions<boolean> = {},
): UsePermissionReturn | UsePermissionReturnWithControls {
  const { controls = false, navigator = defaultNavigator } = options;

  const isSupported = useSupported(() => !!navigator && 'permissions' in navigator);

  const desc = (isString(permissionDesc)
    ? { name: permissionDesc }
    : permissionDesc) as PermissionDescriptor;

  // Shallow refs: `PermissionStatus` is a host object, deep reactivity is wasteful.
  const permissionStatus: ShallowRef<PermissionStatus | undefined> = shallowRef();
  const state: ShallowRef<PermissionState | undefined> = shallowRef();

  const update = (): void => {
    state.value = permissionStatus.value?.state ?? 'prompt';
  };

  // Register the `change` listener synchronously against the reactive ref so it
  // auto-rebinds when the status resolves and auto-cleans on scope dispose.
  useEventListener(permissionStatus, 'change', update, { passive: true });

  // Dedupe concurrent/repeat calls: once a query is in flight we reuse it.
  let queryPromise: Promise<PermissionStatus | undefined> | undefined;

  const query = (): Promise<PermissionStatus | undefined> => {
    if (!isSupported.value)
      return Promise.resolve(undefined);

    if (permissionStatus.value)
      return Promise.resolve(permissionStatus.value);

    if (queryPromise)
      return queryPromise;

    queryPromise = navigator!.permissions
      .query(desc)
      .then((status) => {
        permissionStatus.value = status;
        return status;
      })
      .catch(() => {
        permissionStatus.value = undefined;
        return undefined;
      })
      .finally(() => {
        update();
        queryPromise = undefined;
      });

    return queryPromise;
  };

  query();

  if (controls) {
    return {
      state: state as UsePermissionReturn,
      isSupported,
      // `toRaw` so callers get the underlying `PermissionStatus`, not a reactive proxy.
      query: () => query().then(status => (status ? toRaw(status) : undefined)),
    };
  }

  return state as UsePermissionReturn;
}
