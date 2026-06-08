import { shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useSupported } from '@/composables/utilities/useSupported';
import { bypassFilter, createFilterWrapper } from '@/utils/filters';
import type { ConfigurableEventFilter } from '@/utils/filters';

export interface UseDeviceMotionOptions extends ConfigurableWindow, ConfigurableEventFilter {
  /**
   * Eagerly request permission on iOS 13+ where `DeviceMotionEvent.requestPermission`
   * gates access. When `false` you can call {@link UseDeviceMotionReturn.ensurePermissions}
   * later from a user gesture (the spec requires a gesture).
   *
   * @default false
   */
  requestPermissions?: boolean;

  /**
   * Handler invoked when permission request rejects. Defaults to a no-op
   * (the composable never writes to the console).
   *
   * @default noop
   */
  onError?: (error: unknown) => void;
}

export interface UseDeviceMotionReturn {
  /**
   * Whether the `DeviceMotionEvent` API is supported.
   */
  isSupported: ComputedRef<boolean>;

  /**
   * Whether an explicit permission grant is required (iOS 13+).
   */
  requirePermissions: ComputedRef<boolean>;

  /**
   * Whether motion permission has been granted.
   */
  permissionGranted: ShallowRef<boolean>;

  /**
   * Acceleration of the device on the three axes, excluding gravity (m/s²).
   */
  acceleration: ShallowRef<DeviceMotionEventAcceleration | null>;

  /**
   * Acceleration of the device on the three axes, including gravity (m/s²).
   */
  accelerationIncludingGravity: ShallowRef<DeviceMotionEventAcceleration | null>;

  /**
   * Rate of change of the device's orientation on the three axes (deg/s).
   */
  rotationRate: ShallowRef<DeviceMotionEventRotationRate | null>;

  /**
   * Interval, in ms, at which data is obtained from the underlying hardware.
   */
  interval: ShallowRef<number>;

  /**
   * Request motion permission (iOS 13+). Must be triggered by a user gesture.
   * Resolves once the request settles; on grant the listener is attached.
   */
  ensurePermissions: () => Promise<void>;
}

interface DeviceMotionEventIos {
  requestPermission: () => Promise<'granted' | 'denied'>;
}

/**
 * @name useDeviceMotion
 * @category Sensors
 * @description Reactive `DeviceMotionEvent` exposing acceleration (with and
 * without gravity), rotation rate, and the hardware sampling interval. SSR-safe,
 * uses a single passive listener, and supports the iOS 13+ permission flow.
 *
 * @param {UseDeviceMotionOptions} [options={}] Options
 * @returns {UseDeviceMotionReturn} Reactive motion data plus support/permission state
 *
 * @example
 * const { acceleration, rotationRate, interval } = useDeviceMotion();
 *
 * @example
 * // iOS 13+: request permission from a user gesture, throttle updates
 * const { ensurePermissions, acceleration } = useDeviceMotion({ eventFilter: throttleFilter(100) });
 * button.addEventListener('click', ensurePermissions);
 *
 * @since 0.0.15
 */
export function useDeviceMotion(options: UseDeviceMotionOptions = {}): UseDeviceMotionReturn {
  const {
    window = defaultWindow,
    requestPermissions = false,
    eventFilter = bypassFilter,
    onError = noop,
  } = options;

  // `DeviceMotionEvent` is a global constructor on `typeof globalThis`, not the `Window` interface.
  const globalWindow = window as (Window & typeof globalThis) | undefined;

  const isSupported = useSupported(() => !!window && 'DeviceMotionEvent' in window);
  const requirePermissions = useSupported(() =>
    isSupported.value
    && !!window
    && typeof (globalWindow?.DeviceMotionEvent as unknown as DeviceMotionEventIos | undefined)?.requestPermission === 'function');

  const permissionGranted = shallowRef(false);
  const acceleration = shallowRef<DeviceMotionEventAcceleration | null>(null);
  const accelerationIncludingGravity = shallowRef<DeviceMotionEventAcceleration | null>(null);
  const rotationRate = shallowRef<DeviceMotionEventRotationRate | null>(null);
  const interval = shallowRef(0);

  // Replace whole objects each event (shallowRef) rather than mutating in place,
  // so consumers get a single reactive trigger and no deep-watch overhead.
  const onDeviceMotion = createFilterWrapper(eventFilter, (event: DeviceMotionEvent) => {
    acceleration.value = event.acceleration;
    accelerationIncludingGravity.value = event.accelerationIncludingGravity;
    rotationRate.value = event.rotationRate;
    interval.value = event.interval;
  });

  let bound = false;
  function bind(): void {
    if (bound || !window)
      return;

    bound = true;
    useEventListener(window, 'devicemotion', onDeviceMotion as unknown as (e: Event) => void, { passive: true });
  }

  const ensurePermissions = async (): Promise<void> => {
    if (!isSupported.value)
      return;

    if (!requirePermissions.value) {
      permissionGranted.value = true;
      bind();
      return;
    }

    if (permissionGranted.value)
      return;

    const requestPermission = (globalWindow!.DeviceMotionEvent as unknown as DeviceMotionEventIos).requestPermission;

    try {
      const response = await requestPermission();

      if (response === 'granted') {
        permissionGranted.value = true;
        bind();
      }
    }
    catch (error) {
      onError(error);
    }
  };

  if (isSupported.value) {
    // When a gesture-gated permission is required, defer binding until granted;
    // requestPermissions opts into requesting eagerly (caller must be in a gesture).
    if (requirePermissions.value) {
      if (requestPermissions)
        ensurePermissions();
    }
    else {
      permissionGranted.value = true;
      bind();
    }
  }

  return {
    isSupported,
    requirePermissions,
    permissionGranted,
    acceleration,
    accelerationIncludingGravity,
    rotationRate,
    interval,
    ensurePermissions,
  };
}
