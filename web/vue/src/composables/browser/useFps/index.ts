import { ref } from 'vue';
import type { Ref } from 'vue';
import type { ConfigurableWindow, ResumableActions, ResumableOptions } from '@/types';
import { useRafFn } from '@/composables/browser/useRafFn';
import type { UseRafFnCallbackArgs } from '@/composables/browser/useRafFn';

export interface UseFpsOptions extends ResumableOptions, ConfigurableWindow {
  /**
   * Number of frames to average over for a smoother reading.
   *
   * @default 10
   */
  every?: number;
}

export interface UseFpsReturn extends ResumableActions {
  /**
   * Current frames per second (averaged over the last `every` frames)
   */
  fps: Readonly<Ref<number>>;

  /**
   * Minimum FPS recorded since the composable was created or last reset
   */
  min: Readonly<Ref<number>>;

  /**
   * Maximum FPS recorded since the composable was created or last reset
   */
  max: Readonly<Ref<number>>;

  /**
   * Whether the FPS counter is currently active
   */
  isActive: Readonly<Ref<boolean>>;

  /**
   * Reset min/max tracking
   */
  reset: () => void;
}

/**
 * Reactive FPS counter based on `requestAnimationFrame`.
 * Reports a smoothed FPS value averaged over a configurable number of frames,
 * and tracks min/max values.
 *
 * @param options - Configuration options
 *
 * @example
 * ```ts
 * const { fps, min, max, reset } = useFps();
 * ```
 */
export function useFps(options: UseFpsOptions = {}): UseFpsReturn {
  const { every = 10, ...rafOptions } = options;

  const fps = ref(0);
  const min = ref(Infinity);
  const max = ref(0);

  let deltaSum = 0;
  let frameCount = 0;

  function update({ delta }: UseRafFnCallbackArgs) {
    if (!delta)
      return;

    deltaSum += delta;
    frameCount++;

    if (frameCount < every)
      return;

    const currentFps = Math.round(1000 / (deltaSum / frameCount));

    fps.value = currentFps;

    if (currentFps < min.value)
      min.value = currentFps;

    if (currentFps > max.value)
      max.value = currentFps;

    deltaSum = 0;
    frameCount = 0;
  }

  function reset() {
    min.value = Infinity;
    max.value = 0;
    fps.value = 0;
    deltaSum = 0;
    frameCount = 0;
  }

  const { isActive, pause, resume, toggle } = useRafFn(update, rafOptions);

  return {
    fps,
    min,
    max,
    isActive,
    reset,
    pause,
    resume,
    toggle,
  };
}
