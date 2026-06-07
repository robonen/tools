import { shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { isFunction } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useSupported } from '@/composables/browser/useSupported';

export type OrientationType
  = | 'portrait-primary'
    | 'portrait-secondary'
    | 'landscape-primary'
    | 'landscape-secondary';

export type OrientationLockType
  = | 'any'
    | 'natural'
    | 'landscape'
    | 'portrait'
    | 'portrait-primary'
    | 'portrait-secondary'
    | 'landscape-primary'
    | 'landscape-secondary';

/**
 * Subset of the `ScreenOrientation` interface that we interact with.
 */
export interface ScreenOrientation extends EventTarget {
  readonly type: OrientationType;
  readonly angle: number;
  lock: (orientation: OrientationLockType) => Promise<void>;
  unlock: () => void;
}

export interface UseScreenOrientationOptions extends ConfigurableWindow {}

export interface UseScreenOrientationReturn {
  /**
   * Whether the Screen Orientation API is supported
   */
  isSupported: ComputedRef<boolean>;
  /**
   * Current screen orientation type, or `undefined` when unsupported
   */
  orientation: ShallowRef<OrientationType | undefined>;
  /**
   * Current screen orientation angle in degrees (defaults to `0`)
   */
  angle: ShallowRef<number>;
  /**
   * Lock the screen to the given orientation. Rejects when unsupported.
   */
  lockOrientation: (type: OrientationLockType) => Promise<void>;
  /**
   * Release a previously applied orientation lock. No-op when unsupported.
   */
  unlockOrientation: () => void;
}

/**
 * @name useScreenOrientation
 * @category Browser
 * @description Reactive Screen Orientation API. Tracks the current orientation
 * `type` and `angle`, and exposes helpers to lock/unlock the orientation. SSR-safe.
 *
 * @param {UseScreenOrientationOptions} [options={}] Options (custom `window`)
 * @returns {UseScreenOrientationReturn} `{ isSupported, orientation, angle, lockOrientation, unlockOrientation }`
 *
 * @example
 * const { isSupported, orientation, angle, lockOrientation, unlockOrientation } = useScreenOrientation();
 *
 * @example
 * // Lock to landscape (must run from a user gesture / fullscreen context)
 * const { lockOrientation } = useScreenOrientation();
 * await lockOrientation('landscape');
 *
 * @since 0.0.15
 */
export function useScreenOrientation(options: UseScreenOrientationOptions = {}): UseScreenOrientationReturn {
  const { window = defaultWindow } = options;

  const isSupported = useSupported(() =>
    Boolean(window && 'screen' in window && window.screen && 'orientation' in window.screen));

  const screenOrientation = (isSupported.value ? window!.screen.orientation : {}) as ScreenOrientation;

  const orientation = shallowRef<OrientationType | undefined>(screenOrientation.type);
  const angle = shallowRef(screenOrientation.angle || 0);

  const update = (): void => {
    orientation.value = screenOrientation.type;
    angle.value = screenOrientation.angle;
  };

  if (isSupported.value) {
    // The standard `change` event fires on the `ScreenOrientation` object itself;
    // `orientationchange` on `window` is the legacy fallback for older engines.
    useEventListener(screenOrientation, 'change', update, { passive: true });
    useEventListener(window, 'orientationchange', update, { passive: true });
  }

  const lockOrientation = (type: OrientationLockType): Promise<void> => {
    if (isSupported.value && isFunction(screenOrientation.lock))
      return screenOrientation.lock(type);

    return Promise.reject(new Error('Not supported'));
  };

  const unlockOrientation = (): void => {
    if (isSupported.value && isFunction(screenOrientation.unlock))
      screenOrientation.unlock();
  };

  return {
    isSupported,
    orientation,
    angle,
    lockOrientation,
    unlockOrientation,
  };
}
