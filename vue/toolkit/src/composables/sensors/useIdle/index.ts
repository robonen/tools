import { shallowReadonly, shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import { timestamp } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { createFilterWrapper, throttleFilter } from '@/utils/filters';
import type { ConfigurableEventFilter } from '@/utils/filters';
import { useEventListener } from '@/composables/browser/useEventListener';
import type { WindowEventName } from '@/composables/browser/useEventListener';

const DEFAULT_EVENTS: WindowEventName[] = ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel'];
const ONE_MINUTE = 60_000;

export interface UseIdleOptions extends ConfigurableWindow, ConfigurableEventFilter {
  /**
   * Event names to listen to for detecting user activity
   *
   * @default ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel']
   */
  events?: WindowEventName[];

  /**
   * Reset the idle timer when the document becomes visible again
   *
   * @default true
   */
  listenForVisibilityChange?: boolean;

  /**
   * Initial value of the `idle` ref
   *
   * @default false
   */
  initialState?: boolean;
}

export interface UseIdleReturn {
  /**
   * Whether the user is currently idle
   */
  idle: ShallowRef<boolean>;

  /**
   * Timestamp (ms) of the last detected user activity
   */
  lastActive: ShallowRef<number>;

  /**
   * Whether the idle tracker is currently running
   */
  isPending: Readonly<ShallowRef<boolean>>;

  /**
   * Manually mark the user as active and restart the idle timer
   */
  reset: () => void;

  /**
   * Begin (or resume) tracking. Restarts the idle timer unless `initialState` is `true`
   */
  start: () => void;

  /**
   * Stop tracking. Resets `idle` to `initialState` and clears the pending timer
   */
  stop: () => void;
}

/**
 * @name useIdle
 * @category Sensors
 * @description Track whether the user has been inactive for a given duration.
 *
 * @param {number} [timeout=60000] Idle threshold in milliseconds
 * @param {UseIdleOptions} [options={}] Options
 * @returns {UseIdleReturn} `{ idle, lastActive, isPending, reset, start, stop }`
 *
 * @example
 * const { idle, lastActive, reset } = useIdle(5 * 60_000); // 5 minutes
 *
 * @example
 * const { idle } = useIdle(10_000, { events: ['keydown'] });
 *
 * @since 0.0.15
 */
export function useIdle(
  timeout: number = ONE_MINUTE,
  options: UseIdleOptions = {},
): UseIdleReturn {
  const {
    initialState = false,
    listenForVisibilityChange = true,
    events = DEFAULT_EVENTS,
    window = defaultWindow,
    eventFilter = throttleFilter(50),
  } = options;

  const idle = shallowRef(initialState);
  const lastActive = shallowRef(timestamp());
  const isPending = shallowRef(false);

  let timer: ReturnType<typeof setTimeout> | undefined;

  const reset = (): void => {
    idle.value = false;
    if (timer !== undefined)
      clearTimeout(timer);
    timer = setTimeout(() => {
      idle.value = true;
    }, timeout);
  };

  const onEvent = createFilterWrapper(
    eventFilter,
    () => {
      lastActive.value = timestamp();
      reset();
    },
  );

  const start = (): void => {
    if (isPending.value)
      return;
    isPending.value = true;
    if (!initialState)
      reset();
  };

  const stop = (): void => {
    idle.value = initialState;
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    isPending.value = false;
  };

  if (window) {
    const document = window.document;
    const listenerOptions = { passive: true };

    for (const event of events) {
      useEventListener(window, event, () => {
        if (!isPending.value)
          return;
        onEvent();
      }, listenerOptions);
    }

    if (listenForVisibilityChange) {
      useEventListener(document, 'visibilitychange', () => {
        if (document.hidden || !isPending.value)
          return;
        onEvent();
      }, listenerOptions);
    }

    start();
  }

  return {
    idle,
    lastActive,
    isPending: shallowReadonly(isPending),
    reset,
    start,
    stop,
  };
}
