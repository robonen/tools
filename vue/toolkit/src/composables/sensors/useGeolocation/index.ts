import { shallowReadonly, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultNavigator } from '@/types';
import type { ConfigurableNavigator } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseGeolocationOptions extends ConfigurableNavigator {
  /**
   * A boolean that indicates the application would like to receive the best
   * possible results. Reactive — changing it while watching restarts the watcher.
   *
   * @default true
   */
  enableHighAccuracy?: MaybeRefOrGetter<boolean>;

  /**
   * The maximum age in milliseconds of a possible cached position that is
   * acceptable to return. Reactive — changing it while watching restarts the watcher.
   *
   * @default 30000
   */
  maximumAge?: MaybeRefOrGetter<number>;

  /**
   * The maximum length of time in milliseconds the device is allowed to take in
   * order to return a position. Reactive — changing it while watching restarts the watcher.
   *
   * @default 27000
   */
  timeout?: MaybeRefOrGetter<number>;

  /**
   * Start watching the position immediately
   *
   * @default true
   */
  immediate?: boolean;

  /**
   * Called whenever the Geolocation API reports an error. Receives the
   * `GeolocationPositionError`. Useful for reacting to permission denials or
   * timeouts without setting up a watcher on `error`.
   *
   * @default () => {}
   */
  onError?: (error: GeolocationPositionError) => void;
}

export interface UseGeolocationReturn {
  /**
   * Whether the Geolocation API is supported in the current environment.
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * The most recent set of coordinates.
   */
  coords: Readonly<Ref<Omit<GeolocationPosition['coords'], 'toJSON'>>>;

  /**
   * The timestamp of the most recent position, or `null` before the first fix.
   */
  locatedAt: Readonly<Ref<number | null>>;

  /**
   * The most recent error, or `null` if none.
   */
  error: Readonly<Ref<GeolocationPositionError | null>>;

  /**
   * Whether at least one position fix has been received.
   */
  ready: Readonly<Ref<boolean>>;

  /**
   * Whether the position is currently being watched.
   */
  isActive: Readonly<Ref<boolean>>;

  /**
   * Start watching the position.
   */
  resume: () => void;

  /**
   * Stop watching the position.
   */
  pause: () => void;

  /**
   * Request the current position once, without starting a continuous watch.
   * Resolves with the position (and updates `coords`/`locatedAt`) or rejects
   * with a `GeolocationPositionError`.
   */
  getCurrentPosition: () => Promise<GeolocationPosition>;
}

const DEFAULT_COORDS: Omit<GeolocationPosition['coords'], 'toJSON'> = {
  accuracy: 0,
  latitude: Number.POSITIVE_INFINITY,
  longitude: Number.POSITIVE_INFINITY,
  altitude: null,
  altitudeAccuracy: null,
  heading: null,
  speed: null,
};

/**
 * @name useGeolocation
 * @category Sensors
 * @description Reactive Geolocation API. Watches the device position, exposing
 * reactive coordinates, error, and readiness state, plus pause/resume controls
 * and a one-shot `getCurrentPosition`.
 *
 * @param {UseGeolocationOptions} [options={}] Options
 * @returns {UseGeolocationReturn} Reactive position, error, readiness, and watch controls
 *
 * @example
 * const { coords, locatedAt, error, ready } = useGeolocation();
 *
 * @example
 * // One-shot fetch without a continuous watch
 * const { getCurrentPosition } = useGeolocation({ immediate: false });
 * const position = await getCurrentPosition();
 *
 * @since 0.0.15
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    maximumAge = 30000,
    timeout = 27000,
    navigator = defaultNavigator,
    immediate = true,
    onError = noop,
  } = options;

  const isSupported = useSupported(() => navigator && 'geolocation' in navigator);

  const locatedAt = shallowRef<number | null>(null);
  const error = shallowRef<GeolocationPositionError | null>(null);
  const coords = shallowRef<Omit<GeolocationPosition['coords'], 'toJSON'>>(DEFAULT_COORDS);
  const ready = shallowRef(false);
  const isActive = shallowRef(false);

  function resolveOptions(): PositionOptions {
    return {
      enableHighAccuracy: toValue(enableHighAccuracy),
      maximumAge: toValue(maximumAge),
      timeout: toValue(timeout),
    };
  }

  function updatePosition(position: GeolocationPosition): void {
    locatedAt.value = position.timestamp;
    coords.value = position.coords;
    error.value = null;
    ready.value = true;
  }

  function handleError(err: GeolocationPositionError): void {
    error.value = err;
    onError(err);
  }

  let watcher: number | null = null;

  function resume(): void {
    if (!isSupported.value || !navigator || watcher !== null)
      return;

    watcher = navigator.geolocation.watchPosition(updatePosition, handleError, resolveOptions());
    isActive.value = true;
  }

  function pause(): void {
    if (watcher === null || !navigator)
      return;

    navigator.geolocation.clearWatch(watcher);
    watcher = null;
    isActive.value = false;
  }

  function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!isSupported.value || !navigator) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          updatePosition(position);
          resolve(position);
        },
        (err) => {
          handleError(err);
          reject(err);
        },
        resolveOptions(),
      );
    });
  }

  // Restart the watcher when reactive position options change while active.
  watch(
    () => resolveOptions(),
    () => {
      if (isActive.value) {
        pause();
        resume();
      }
    },
    { deep: true },
  );

  if (immediate)
    resume();

  tryOnScopeDispose(pause);

  return {
    isSupported,
    coords,
    locatedAt: shallowReadonly(locatedAt),
    error: shallowReadonly(error),
    ready: shallowReadonly(ready),
    isActive: shallowReadonly(isActive),
    resume,
    pause,
    getCurrentPosition,
  };
}
