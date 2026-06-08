import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { useDeviceOrientation } from '@/composables/sensors/useDeviceOrientation';
import { useMouse } from '@/composables/sensors/useMouse';
import { useScreenOrientation } from '@/composables/sensors/useScreenOrientation';
import { useElementBounding } from '@/composables/elements/useElementBounding';
import { useWindowSize } from '@/composables/elements/useWindowSize';

/**
 * Where the parallax `roll`/`tilt` values are currently being derived from.
 */
export type ParallaxSource = 'deviceOrientation' | 'mouse';

/**
 * Adjusts a normalised (`-0.5 ~ 0.5`) parallax value before it is returned.
 */
export type ParallaxAdjust = (value: number) => number;

export interface UseParallaxOptions extends ConfigurableWindow {
  /**
   * Transform the device-orientation derived tilt before returning it.
   *
   * @default (i) => i
   */
  deviceOrientationTiltAdjust?: ParallaxAdjust;

  /**
   * Transform the device-orientation derived roll before returning it.
   *
   * @default (i) => i
   */
  deviceOrientationRollAdjust?: ParallaxAdjust;

  /**
   * Transform the mouse derived tilt before returning it.
   *
   * @default (i) => i
   */
  mouseTiltAdjust?: ParallaxAdjust;

  /**
   * Transform the mouse derived roll before returning it.
   *
   * @default (i) => i
   */
  mouseRollAdjust?: ParallaxAdjust;
}

export interface UseParallaxReturn {
  /**
   * Roll, scaled to `-0.5 ~ 0.5` (rotation around the horizontal axis).
   */
  roll: ComputedRef<number>;

  /**
   * Tilt, scaled to `-0.5 ~ 0.5` (rotation around the vertical axis).
   */
  tilt: ComputedRef<number>;

  /**
   * The input the effect is currently reading from.
   */
  source: ComputedRef<ParallaxSource>;
}

const identity: ParallaxAdjust = i => i;

/**
 * @name useParallax
 * @category Sensors
 * @description Reactive parallax effect. Prefers the device orientation sensors and
 * transparently falls back to mouse position when orientation is unavailable. Composes
 * {@link useDeviceOrientation} and {@link useMouse}; pass a `target` to make the mouse
 * fallback relative to an element's centre instead of the whole viewport. SSR-safe.
 *
 * @param {MaybeComputedElementRef} [target] Element the mouse fallback is measured against. Omit to use the viewport.
 * @param {UseParallaxOptions} [options={}] Options
 * @returns {UseParallaxReturn} Reactive `roll`, `tilt` (both `-0.5 ~ 0.5`), and `source`
 *
 * @example
 * const { roll, tilt, source } = useParallax(el);
 * // <div :style="{ transform: `rotateX(${roll * 20}deg) rotateY(${tilt * 20}deg)` }" />
 *
 * @example
 * // Viewport-relative, with custom sensitivity on the mouse fallback
 * const { roll, tilt } = useParallax(null, { mouseTiltAdjust: i => i * 2 });
 *
 * @since 0.0.15
 */
export function useParallax(
  target?: MaybeComputedElementRef | null,
  options: UseParallaxOptions = {},
): UseParallaxReturn {
  const {
    deviceOrientationTiltAdjust = identity,
    deviceOrientationRollAdjust = identity,
    mouseTiltAdjust = identity,
    mouseRollAdjust = identity,
    window = defaultWindow,
  } = options;

  const orientation = useDeviceOrientation({ window });
  const screen = useScreenOrientation({ window });
  const { x, y } = useMouse({ window, type: 'client' });

  // Only observe an element box when a target is supplied; otherwise fall back to
  // the viewport size so we never pay for a ResizeObserver/MutationObserver we
  // don't need.
  const hasTarget = target !== null && target !== undefined;
  const box = hasTarget ? useElementBounding(target as MaybeComputedElementRef, { window }) : null;
  const viewport = hasTarget ? null : useWindowSize({ window });

  const source = computed<ParallaxSource>(() => {
    if (orientation.isSupported.value
      && ((orientation.alpha.value !== null && orientation.alpha.value !== 0)
        || (orientation.gamma.value !== null && orientation.gamma.value !== 0))) {
      return 'deviceOrientation';
    }

    return 'mouse';
  });

  const roll = computed<number>(() => {
    if (source.value === 'deviceOrientation') {
      let value: number;

      switch (screen.orientation.value) {
        case 'landscape-primary':
          value = orientation.gamma.value! / 90;
          break;
        case 'landscape-secondary':
          value = -orientation.gamma.value! / 90;
          break;
        case 'portrait-secondary':
          value = orientation.beta.value! / 90;
          break;
        case 'portrait-primary':
        default:
          value = -orientation.beta.value! / 90;
      }

      return deviceOrientationRollAdjust(value);
    }

    const height = box ? box.height.value : viewport!.height.value;
    const offsetY = box ? y.value - box.top.value : y.value;

    return mouseRollAdjust(-(offsetY - height / 2) / height);
  });

  const tilt = computed<number>(() => {
    if (source.value === 'deviceOrientation') {
      let value: number;

      switch (screen.orientation.value) {
        case 'landscape-primary':
          value = orientation.beta.value! / 90;
          break;
        case 'landscape-secondary':
          value = -orientation.beta.value! / 90;
          break;
        case 'portrait-secondary':
          value = -orientation.gamma.value! / 90;
          break;
        case 'portrait-primary':
        default:
          value = orientation.gamma.value! / 90;
      }

      return deviceOrientationTiltAdjust(value);
    }

    const width = box ? box.width.value : viewport!.width.value;
    const offsetX = box ? x.value - box.left.value : x.value;

    return mouseTiltAdjust((offsetX - width / 2) / width);
  });

  return { roll, tilt, source };
}
