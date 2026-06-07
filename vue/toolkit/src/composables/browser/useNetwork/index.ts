import { shallowReadonly, shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import { timestamp } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useSupported } from '@/composables/browser/useSupported';

export type NetworkType
  = | 'bluetooth'
    | 'cellular'
    | 'ethernet'
    | 'none'
    | 'wifi'
    | 'wimax'
    | 'other'
    | 'unknown';

export type NetworkEffectiveType = 'slow-2g' | '2g' | '3g' | '4g' | undefined;

export interface UseNetworkOptions extends ConfigurableWindow {}

export interface UseNetworkReturn {
  /**
   * Whether the Network Information API (`navigator.connection`) is supported.
   */
  isSupported: Readonly<ShallowRef<boolean>>;
  /**
   * Whether the browser is currently online (`navigator.onLine`).
   */
  isOnline: Readonly<ShallowRef<boolean>>;
  /**
   * The timestamp of the last time the browser went offline, in ms.
   */
  offlineAt: Readonly<ShallowRef<number | undefined>>;
  /**
   * The timestamp of the last time the browser came back online, in ms.
   */
  onlineAt: Readonly<ShallowRef<number | undefined>>;
  /**
   * The estimated effective bandwidth in megabits per second.
   */
  downlink: Readonly<ShallowRef<number | undefined>>;
  /**
   * The maximum downlink speed of the underlying connection technology, in Mbps.
   */
  downlinkMax: Readonly<ShallowRef<number | undefined>>;
  /**
   * The effective type of the connection (`slow-2g`, `2g`, `3g`, or `4g`).
   */
  effectiveType: Readonly<ShallowRef<NetworkEffectiveType>>;
  /**
   * The estimated effective round-trip time of the current connection, in ms.
   */
  rtt: Readonly<ShallowRef<number | undefined>>;
  /**
   * Whether the user has requested a reduced data usage mode.
   */
  saveData: Readonly<ShallowRef<boolean | undefined>>;
  /**
   * The type of connection a device is using to communicate with the network.
   */
  type: Readonly<ShallowRef<NetworkType>>;
}

interface NetworkInformation extends EventTarget {
  readonly downlink?: number;
  readonly downlinkMax?: number;
  readonly effectiveType?: NetworkEffectiveType;
  readonly rtt?: number;
  readonly saveData?: boolean;
  readonly type?: NetworkType;
}

/**
 * @name useNetwork
 * @category Browser
 * @description Reactive Network Information API state plus online/offline status.
 *
 * @param {UseNetworkOptions} [options={}] Options
 * @returns {UseNetworkReturn} Reactive online status, transition timestamps, and connection info
 *
 * @example
 * const { isOnline, offlineAt, downlink, effectiveType, saveData, type } = useNetwork();
 *
 * @since 0.0.15
 */
export function useNetwork(options: UseNetworkOptions = {}): UseNetworkReturn {
  const { window = defaultWindow } = options;
  const navigator = window?.navigator;

  const isSupported = useSupported(() => !!navigator && 'connection' in navigator);

  const isOnline = shallowRef(navigator?.onLine ?? true);
  const saveData = shallowRef<boolean | undefined>(undefined);
  const offlineAt = shallowRef<number | undefined>(undefined);
  const onlineAt = shallowRef<number | undefined>(undefined);
  const downlink = shallowRef<number | undefined>(undefined);
  const downlinkMax = shallowRef<number | undefined>(undefined);
  const rtt = shallowRef<number | undefined>(undefined);
  const effectiveType = shallowRef<NetworkEffectiveType>(undefined);
  const type = shallowRef<NetworkType>('unknown');

  const connection = navigator && 'connection' in navigator
    ? (navigator as Navigator & { connection?: NetworkInformation }).connection
    : undefined;

  function updateNetworkInformation(): void {
    if (!navigator)
      return;

    isOnline.value = navigator.onLine;
    offlineAt.value = isOnline.value ? offlineAt.value : timestamp();
    onlineAt.value = isOnline.value ? timestamp() : onlineAt.value;

    if (connection) {
      downlink.value = connection.downlink;
      downlinkMax.value = connection.downlinkMax;
      effectiveType.value = connection.effectiveType;
      rtt.value = connection.rtt;
      saveData.value = connection.saveData;
      type.value = connection.type ?? 'unknown';
    }
  }

  const listenerOptions = { passive: true } as const;

  if (window) {
    useEventListener(window, 'offline', () => {
      isOnline.value = false;
      offlineAt.value = timestamp();
    }, listenerOptions);

    useEventListener(window, 'online', () => {
      isOnline.value = true;
      onlineAt.value = timestamp();
    }, listenerOptions);
  }

  if (connection)
    useEventListener(connection, 'change', updateNetworkInformation, listenerOptions);

  updateNetworkInformation();

  return {
    isSupported,
    isOnline: shallowReadonly(isOnline),
    saveData: shallowReadonly(saveData),
    offlineAt: shallowReadonly(offlineAt),
    onlineAt: shallowReadonly(onlineAt),
    downlink: shallowReadonly(downlink),
    downlinkMax: shallowReadonly(downlinkMax),
    effectiveType: shallowReadonly(effectiveType),
    rtt: shallowReadonly(rtt),
    type: shallowReadonly(type),
  };
}
