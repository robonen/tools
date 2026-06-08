import { shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useSupported } from '@/composables/utilities/useSupported';

export interface UseDeviceOrientationOptions extends ConfigurableWindow {}

export interface UseDeviceOrientationReturn {
  /**
   * Whether the `DeviceOrientationEvent` is supported in the current environment.
   */
  isSupported: ComputedRef<boolean>;

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
}

/**
 * @name useDeviceOrientation
 * @category Sensors
 * @description Reactive [`DeviceOrientationEvent`](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent).
 * Provides physical orientation of the device relative to Earth's coordinate frame.
 *
 * @param {UseDeviceOrientationOptions} [options={}] Options
 * @returns {UseDeviceOrientationReturn} `isSupported`, `isAbsolute`, and the `alpha`/`beta`/`gamma` angles
 *
 * @example
 * const { isSupported, isAbsolute, alpha, beta, gamma } = useDeviceOrientation();
 *
 * @since 0.0.15
 */
export function useDeviceOrientation(options: UseDeviceOrientationOptions = {}): UseDeviceOrientationReturn {
  const { window = defaultWindow } = options;

  const isSupported = useSupported(() => !!window && 'DeviceOrientationEvent' in window);

  const isAbsolute = shallowRef(false);
  const alpha = shallowRef<number | null>(null);
  const beta = shallowRef<number | null>(null);
  const gamma = shallowRef<number | null>(null);

  if (window) {
    useEventListener(window, 'deviceorientation', (event: DeviceOrientationEvent) => {
      isAbsolute.value = event.absolute;
      alpha.value = event.alpha;
      beta.value = event.beta;
      gamma.value = event.gamma;
    }, { passive: true });
  }

  return {
    isSupported,
    isAbsolute,
    alpha,
    beta,
    gamma,
  };
}
