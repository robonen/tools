import { readonly, ref } from 'vue';
import type { Ref } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow, ResumableActions, ResumableOptions } from '@/types';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseRafFnCallbackArgs {
  /**
   * Time elapsed since the last frame in milliseconds
   */
  delta: number;

  /**
   * `DOMHighResTimeStamp` passed by `requestAnimationFrame`
   */
  timestamp: DOMHighResTimeStamp;
}

export interface UseRafFnOptions extends ResumableOptions, ConfigurableWindow {
  /**
   * Maximum frames per second. Set to `0` or `undefined` to disable the limit.
   *
   * @default undefined
   */
  fpsLimit?: number;
}

export interface UseRafFnReturn extends ResumableActions {
  /**
   * Whether the RAF loop is currently active
   */
  isActive: Readonly<Ref<boolean>>;
}

/**
 * Call a function on every `requestAnimationFrame` with delta time tracking.
 * Automatically cleans up when the component scope is disposed.
 *
 * @param callback - Function to call on every animation frame
 * @param options - Configuration options
 *
 * @example
 * ```ts
 * const { pause, resume, isActive } = useRafFn(({ delta, timestamp }) => {
 *   console.log(`${delta}ms since last frame`);
 * });
 * ```
 */
export function useRafFn(
  callback: (args: UseRafFnCallbackArgs) => void,
  options: UseRafFnOptions = {},
): UseRafFnReturn {
  const {
    immediate = true,
    fpsLimit,
  } = options;

  const window = 'window' in options ? options.window : defaultWindow;

  const isActive = ref(false);
  const intervalLimit = fpsLimit ? 1000 / fpsLimit : null;

  let previousFrameTimestamp = 0;
  let rafId: number | null = null;

  function loop(timestamp: DOMHighResTimeStamp) {
    if (!isActive.value || !window)
      return;

    if (!previousFrameTimestamp)
      previousFrameTimestamp = timestamp;

    const delta = timestamp - previousFrameTimestamp;

    if (intervalLimit && delta && delta < intervalLimit) {
      rafId = window.requestAnimationFrame(loop);
      return;
    }

    previousFrameTimestamp = timestamp;
    callback({ delta, timestamp });
    rafId = window.requestAnimationFrame(loop);
  }

  function resume() {
    if (!isActive.value && window) {
      isActive.value = true;
      previousFrameTimestamp = 0;
      rafId = window.requestAnimationFrame(loop);
    }
  }

  function pause() {
    isActive.value = false;

    if (rafId !== null && window) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function toggle() {
    if (isActive.value)
      pause();
    else
      resume();
  }

  if (immediate)
    resume();

  tryOnScopeDispose(pause);

  return {
    isActive: readonly(isActive),
    pause,
    resume,
    toggle,
  };
}
