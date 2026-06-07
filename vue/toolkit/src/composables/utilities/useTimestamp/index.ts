import { shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { timestamp } from '@robonen/stdlib';
import type { ResumableActions } from '@/types';
import { useRafFn } from '@/composables/browser/useRafFn';
import { useIntervalFn } from '@/composables/browser/useIntervalFn';

export interface UseTimestampOptions<Controls extends boolean> {
  /**
   * Expose pause/resume controls alongside the timestamp
   *
   * @default false
   */
  controls?: Controls;

  /**
   * Offset added to the timestamp in milliseconds. Accepts a reactive value
   * (ref or getter); the timestamp recomputes with the latest offset on the
   * next update.
   *
   * @default 0
   */
  offset?: MaybeRefOrGetter<number>;

  /**
   * Start updating immediately
   *
   * @default true
   */
  immediate?: boolean;

  /**
   * Update strategy. `'requestAnimationFrame'` updates every frame; a number
   * updates on a fixed interval (ms).
   *
   * @default 'requestAnimationFrame'
   */
  interval?: 'requestAnimationFrame' | number;

  /**
   * Callback invoked on every update with the current timestamp
   */
  callback?: (timestamp: number) => void;
}

/**
 * Pause/resume controls returned when `controls: true`.
 */
export interface UseTimestampControls extends ResumableActions {
  /**
   * The reactive timestamp
   */
  timestamp: Ref<number>;

  /**
   * Whether the updater (RAF loop or interval) is currently active
   */
  isActive: Readonly<Ref<boolean>>;
}

export type UseTimestampReturn<Controls extends boolean> = Controls extends true
  ? UseTimestampControls
  : Ref<number>;

/**
 * @name useTimestamp
 * @category Utilities
 * @description Reactive current timestamp, updated via `requestAnimationFrame`
 * or a fixed interval.
 *
 * @param {UseTimestampOptions} [options={}] Options
 * @returns {Ref<number> | UseTimestampControls} The timestamp, or controls when `controls: true`
 *
 * @example
 * const now = useTimestamp();
 *
 * @example
 * const { timestamp, pause, resume, isActive } = useTimestamp({ controls: true, interval: 1000 });
 *
 * @example
 * // Reactive offset
 * const offset = ref(0);
 * const now = useTimestamp({ offset });
 *
 * @since 0.0.15
 */
export function useTimestamp(options?: UseTimestampOptions<false>): Ref<number>;
export function useTimestamp(options: UseTimestampOptions<true>): UseTimestampControls;
export function useTimestamp(
  options: UseTimestampOptions<boolean> = {},
): Ref<number> | UseTimestampControls {
  const {
    controls = false,
    offset = 0,
    immediate = true,
    interval = 'requestAnimationFrame',
    callback,
  } = options;

  const ts = shallowRef(timestamp() + toValue(offset));

  const update = callback
    ? () => {
        ts.value = timestamp() + toValue(offset);
        callback(ts.value);
      }
    : () => {
        ts.value = timestamp() + toValue(offset);
      };

  const resumableControls = interval === 'requestAnimationFrame'
    ? useRafFn(update, { immediate })
    : useIntervalFn(update, interval, { immediate });

  if (controls) {
    return {
      timestamp: ts,
      ...resumableControls,
    };
  }

  return ts;
}
