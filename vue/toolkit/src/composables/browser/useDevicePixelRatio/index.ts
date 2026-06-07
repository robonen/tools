import { noop } from '@robonen/stdlib';
import { shallowReadonly, shallowRef, watch } from 'vue';
import type { ShallowRef, WatchStopHandle } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useMediaQuery } from '@/composables/browser/useMediaQuery';

export interface UseDevicePixelRatioOptions extends ConfigurableWindow {}

export interface UseDevicePixelRatioReturn {
  /**
   * Reactive, readonly `window.devicePixelRatio`. Defaults to `1` on the
   * server / when no window is available.
   */
  pixelRatio: Readonly<ShallowRef<number>>;
  /**
   * Stop tracking the device pixel ratio. Idempotent and a no-op on SSR.
   */
  stop: WatchStopHandle;
}

/**
 * @name useDevicePixelRatio
 * @category Browser
 * @description Reactively track `window.devicePixelRatio`, updated via a
 * `matchMedia(resolution)` listener (fires on zoom and on monitor changes).
 *
 * @param {UseDevicePixelRatioOptions} [options={}] Options (custom `window`)
 * @returns {UseDevicePixelRatioReturn} `{ pixelRatio, stop }`
 *
 * @example
 * const { pixelRatio } = useDevicePixelRatio();
 *
 * @since 0.0.15
 */
export function useDevicePixelRatio(options: UseDevicePixelRatioOptions = {}): UseDevicePixelRatioReturn {
  const { window = defaultWindow } = options;

  const pixelRatio = shallowRef(1);

  // `devicePixelRatio` has no `change` event; the canonical trick is to watch a
  // `(resolution: Ndppx)` media query whose threshold tracks the current ratio.
  // When the real ratio crosses that threshold the query flips, re-evaluating
  // the reactive query string and re-binding to a fresh MediaQueryList.
  const query = useMediaQuery(() => `(resolution: ${pixelRatio.value}dppx)`, options);

  let stop: WatchStopHandle = noop;

  if (window) {
    stop = watch(
      query,
      () => {
        pixelRatio.value = window.devicePixelRatio;
      },
      { immediate: true },
    );
  }

  return {
    pixelRatio: shallowReadonly(pixelRatio),
    stop,
  };
}
