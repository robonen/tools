import { shallowReadonly, shallowRef } from 'vue';
import type { Ref } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultNavigator } from '@/types';
import type { ConfigurableNavigator } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { useEventListener } from '@/composables/browser/useEventListener';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

/**
 * The `BatteryManager` interface of the Battery Status API.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BatteryManager
 */
export interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

type NavigatorWithBattery
  = Navigator & {
    getBattery: () => Promise<BatteryManager>;
  };

export interface UseBatteryOptions extends ConfigurableNavigator {
  /**
   * Called whenever `navigator.getBattery()` rejects. Receives the thrown
   * error. Useful for surfacing failures without inspecting it via a watcher.
   *
   * @default () => {}
   */
  onError?: (error: unknown) => void;
}

export interface UseBatteryReturn {
  /**
   * Whether the Battery Status API is supported in the current environment.
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * Whether the device is currently charging.
   */
  charging: Readonly<Ref<boolean>>;

  /**
   * Seconds remaining until the battery is fully charged, or `0` if already
   * full / not charging. `Infinity` while charging time is unknown.
   */
  chargingTime: Readonly<Ref<number>>;

  /**
   * Seconds remaining until the battery is fully discharged, or `0`.
   * `Infinity` while discharging time is unknown.
   */
  dischargingTime: Readonly<Ref<number>>;

  /**
   * Battery charge level as a number between `0` and `1`.
   */
  level: Readonly<Ref<number>>;
}

const BATTERY_EVENTS: string[] = [
  'chargingchange',
  'chargingtimechange',
  'dischargingtimechange',
  'levelchange',
];

/**
 * @name useBattery
 * @category Sensors
 * @description Reactive Battery Status API. Tracks the device charging state,
 * charge level, and the estimated charging/discharging times, keeping them in
 * sync with the underlying `BatteryManager` events.
 *
 * @param {UseBatteryOptions} [options={}] Options
 * @returns {UseBatteryReturn} Reactive support flag, charging state, charging/discharging times, and level
 *
 * @example
 * const { charging, level, chargingTime, dischargingTime } = useBattery();
 *
 * @example
 * // React to acquisition failures
 * const { isSupported } = useBattery({ onError: (e) => report(e) });
 *
 * @since 0.0.15
 */
export function useBattery(options: UseBatteryOptions = {}): UseBatteryReturn {
  const { navigator = defaultNavigator, onError = noop } = options;

  const isSupported = useSupported(
    () => !!navigator && 'getBattery' in navigator && typeof (navigator as NavigatorWithBattery).getBattery === 'function',
  );

  const charging = shallowRef(false);
  const chargingTime = shallowRef(0);
  const dischargingTime = shallowRef(0);
  const level = shallowRef(1);

  function updateBatteryInfo(this: BatteryManager): void {
    charging.value = this.charging;
    chargingTime.value = this.chargingTime || 0;
    dischargingTime.value = this.dischargingTime || 0;
    level.value = this.level;
  }

  if (isSupported.value) {
    let disposed = false;

    // getBattery() resolves asynchronously, so the scope may have been torn
    // down before the manager is ready — guard against late event binding.
    tryOnScopeDispose(() => {
      disposed = true;
    });

    (navigator as NavigatorWithBattery)
      .getBattery()
      .then((battery) => {
        if (disposed)
          return;

        updateBatteryInfo.call(battery);
        useEventListener(battery, BATTERY_EVENTS, updateBatteryInfo, { passive: true });
      })
      .catch(onError);
  }

  return {
    isSupported,
    charging: shallowReadonly(charging),
    chargingTime: shallowReadonly(chargingTime),
    dischargingTime: shallowReadonly(dischargingTime),
    level: shallowReadonly(level),
  };
}
