import { shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useSupported } from '@/composables/utilities/useSupported';

export interface UseDeviceOrientationOptions extends ConfigurableWindow {
  /**
   * Eagerly request permission on iOS 13+ where `DeviceOrientationEvent.requestPermission`
   * gates access. When `false` you can call {@link UseDeviceOrientationReturn.ensurePermissions}
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

export interface UseDeviceOrientationReturn {
  /**
   * Whether the `DeviceOrientationEvent` is supported in the current environment.
   */
  isSupported: ComputedRef<boolean>;

  /**
   * Whether an explicit permission grant is required (iOS 13+).
   */
  requirePermissions: ComputedRef<boolean>;

  /**
   * Whether orientation permission has been granted.
   */
  permissionGranted: ShallowRef<boolean>;

  /**
   * Whether the device is providing orientation data absolutely (relative to
   * Earth's coordinate frame) rather than relative to an arbitrary frame.
   */
  isAbsolute: ShallowRef<boolean>;

  /**
   * Motion of the device around the z axis, in degrees (`0`–`360`), or `null`
   * when unavailable.
   */
  alpha: ShallowRef<number | null>;

  /**
   * Motion of the device around the x axis, in degrees (`-180`–`180`), or `null`
   * when unavailable.
   */
  beta: ShallowRef<number | null>;

  /**
   * Motion of the device around the y axis, in degrees (`-90`–`90`), or `null`
   * when unavailable.
   */
  gamma: ShallowRef<number | null>;

  /**
   * Request orientation permission (iOS 13+). Must be triggered by a user gesture.
   * Resolves once the request settles; on grant the listener is attached.
   */
  ensurePermissions: () => Promise<void>;
}

interface DeviceOrientationEventIos {
  requestPermission: () => Promise<'granted' | 'denied'>;
}

/**
 * @name useDeviceOrientation
 * @category Sensors
 * @description Reactive [`DeviceOrientationEvent`](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent).
 * Provides physical orientation of the device relative to Earth's coordinate frame.
 * SSR-safe, uses a single passive listener, and supports the iOS 13+ permission flow.
 *
 * @param {UseDeviceOrientationOptions} [options={}] Options
 * @returns {UseDeviceOrientationReturn} `isSupported`, `isAbsolute`, the `alpha`/`beta`/`gamma` angles, and the permission state
 *
 * @example
 * const { isSupported, isAbsolute, alpha, beta, gamma } = useDeviceOrientation();
 *
 * @example
 * // iOS 13+: request permission from a user gesture
 * const { ensurePermissions, alpha, beta, gamma } = useDeviceOrientation();
 * button.addEventListener('click', ensurePermissions);
 *
 * @since 0.0.14
 */
export function useDeviceOrientation(options: UseDeviceOrientationOptions = {}): UseDeviceOrientationReturn {
  const {
    window = defaultWindow,
    requestPermissions = false,
    onError = noop,
  } = options;

  // `DeviceOrientationEvent` is a global constructor on `typeof globalThis`, not the `Window` interface.
  const globalWindow = window as (Window & typeof globalThis) | undefined;

  const isSupported = useSupported(() => !!window && 'DeviceOrientationEvent' in window);
  const requirePermissions = useSupported(() =>
    isSupported.value
    && !!window
    && typeof (globalWindow?.DeviceOrientationEvent as unknown as DeviceOrientationEventIos | undefined)?.requestPermission === 'function');

  const permissionGranted = shallowRef(false);
  const isAbsolute = shallowRef(false);
  const alpha = shallowRef<number | null>(null);
  const beta = shallowRef<number | null>(null);
  const gamma = shallowRef<number | null>(null);

  let bound = false;
  function bind(): void {
    if (bound || !window)
      return;

    bound = true;
    useEventListener(window, 'deviceorientation', (event: DeviceOrientationEvent) => {
      isAbsolute.value = event.absolute;
      alpha.value = event.alpha;
      beta.value = event.beta;
      gamma.value = event.gamma;
    }, { passive: true });
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

    const requestPermission = (globalWindow!.DeviceOrientationEvent as unknown as DeviceOrientationEventIos).requestPermission;

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
    isAbsolute,
    alpha,
    beta,
    gamma,
    ensurePermissions,
  };
}
