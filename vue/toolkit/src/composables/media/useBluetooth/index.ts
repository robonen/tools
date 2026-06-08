import { shallowReadonly, shallowRef, watch } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultNavigator } from '@/types';
import type { ConfigurableNavigator } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { useEventListener } from '@/composables/browser/useEventListener';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseBluetoothRequestDeviceOptions {
  /**
   * An array of `BluetoothLEScanFilter`. Each filter consists of an array of
   * `BluetoothServiceUUID`s, a `name` parameter, and a `namePrefix` parameter.
   */
  filters?: BluetoothLEScanFilter[];

  /**
   * An array of `BluetoothServiceUUID`s that the device may expose but that are
   * not part of `filters`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTService/uuid
   */
  optionalServices?: BluetoothServiceUUID[];
}

export interface UseBluetoothOptions extends UseBluetoothRequestDeviceOptions, ConfigurableNavigator {
  /**
   * Accept all Bluetooth devices in the chooser.
   *
   * !! Showing every nearby device wastes energy (no filters) and is rarely what
   * you want — prefer `filters`. Ignored when `filters` is non-empty.
   *
   * @default false
   */
  acceptAllDevices?: boolean;

  /**
   * Called when `requestDevice` or a GATT connection rejects, instead of
   * throwing. The same value is also stored in the returned `error` ref.
   *
   * @default noop
   */
  onError?: (error: unknown) => void;
}

export interface UseBluetoothReturn {
  /**
   * Whether the Web Bluetooth API is available
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * Whether a GATT server connection is currently established
   */
  isConnected: Readonly<ShallowRef<boolean>>;

  /**
   * The selected Bluetooth device, or `undefined` before one is chosen
   */
  device: ShallowRef<BluetoothDevice | undefined>;

  /**
   * Prompt the user to pick a device, then connect to its GATT server
   */
  requestDevice: () => Promise<void>;

  /**
   * Re-establish the GATT connection to the current `device`
   */
  connect: () => Promise<void>;

  /**
   * Disconnect from the current device's GATT server
   */
  disconnect: () => void;

  /**
   * The connected GATT server, or `undefined` while disconnected
   */
  server: ShallowRef<BluetoothRemoteGATTServer | undefined>;

  /**
   * The last error thrown by `requestDevice` or a connection attempt
   */
  error: ShallowRef<unknown | null>;
}

/**
 * @name useBluetooth
 * @category Media
 * @description Reactive Web Bluetooth API. Prompts for a device and tracks its GATT server connection.
 *
 * @param {UseBluetoothOptions} [options={}] Options
 * @param {boolean} [options.acceptAllDevices=false] Show all devices in the chooser (ignored when `filters` is set)
 * @param {BluetoothLEScanFilter[]} [options.filters] Device scan filters
 * @param {BluetoothServiceUUID[]} [options.optionalServices] Optional GATT services to request access to
 * @param {Function} [options.onError=noop] Error callback invoked instead of throwing
 * @param {Navigator} [options.navigator=defaultNavigator] Custom `navigator` instance
 * @returns {UseBluetoothReturn} `isSupported`, `isConnected`, `device`, `requestDevice`, `connect`, `disconnect`, `server`, and `error`
 *
 * @example
 * const { isSupported, isConnected, device, requestDevice, server, error } = useBluetooth({
 *   acceptAllDevices: true,
 * });
 * requestDevice();
 *
 * @example
 * // Filter by advertised service and request access to the battery service
 * const { device, requestDevice, server } = useBluetooth({
 *   filters: [{ services: ['heart_rate'] }],
 *   optionalServices: ['battery_service'],
 * });
 *
 * @since 0.0.15
 */
export function useBluetooth(options: UseBluetoothOptions = {}): UseBluetoothReturn {
  const {
    filters,
    optionalServices,
    navigator = defaultNavigator,
    onError = noop,
  } = options;

  // `acceptAllDevices` is forced off whenever filters narrow the chooser, so it lives in a local.
  const hasFilters = !!filters && filters.length > 0;
  const acceptAllDevices = hasFilters ? false : options.acceptAllDevices ?? false;

  const isSupported = useSupported(() => navigator && 'bluetooth' in navigator);

  const device = shallowRef<BluetoothDevice | undefined>();
  const server = shallowRef<BluetoothRemoteGATTServer | undefined>();
  const isConnected = shallowRef(false);
  const error = shallowRef<unknown | null>(null);

  function reset(): void {
    isConnected.value = false;
    server.value = undefined;
  }

  function fail(err: unknown): void {
    error.value = err;
    onError(err);
  }

  // A single reactive listener tied to `device` — re-binds itself whenever the device changes
  // instead of stacking a new listener on every connect (as VueUse does).
  useEventListener(device, 'gattserverdisconnected', reset, { passive: true });

  async function connect(): Promise<void> {
    error.value = null;

    const gatt = device.value?.gatt;

    if (!gatt)
      return;

    try {
      server.value = await gatt.connect();
      isConnected.value = server.value.connected;
    }
    catch (err) {
      reset();
      fail(err);
    }
  }

  function disconnect(): void {
    device.value?.gatt?.disconnect();
    reset();
  }

  // Auto-(re)connect when a new device is selected.
  watch(device, () => {
    reset();
    connect();
  });

  async function requestDevice(): Promise<void> {
    if (!isSupported.value)
      return;

    error.value = null;

    try {
      // `isSupported` guarantees `navigator.bluetooth` exists before we get here.
      device.value = await navigator!.bluetooth!.requestDevice({
        acceptAllDevices,
        filters,
        optionalServices,
      });
    }
    catch (err) {
      fail(err);
    }
  }

  tryOnMounted(() => {
    if (device.value?.gatt)
      connect();
  });

  tryOnScopeDispose(() => {
    if (device.value?.gatt)
      device.value.gatt.disconnect();
  });

  return {
    isSupported,
    isConnected: shallowReadonly(isConnected),
    device,
    requestDevice,
    connect,
    disconnect,
    server,
    error,
  };
}
