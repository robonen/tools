import { computed, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { clamp, isFunction, isNumber, lerp, noop } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useRafFn } from '@/composables/animation/useRafFn';

/**
 * Cubic bezier control points `[x1, y1, x2, y2]` (the implied endpoints are
 * `(0, 0)` and `(1, 1)`), matching the CSS `cubic-bezier()` argument order.
 */
export type CubicBezierPoints = [number, number, number, number];

/**
 * An easing function mapping linear progress in `[0, 1]` to eased progress.
 */
export type EasingFunction = (n: number) => number;

/**
 * Interpolates between two values of `T` given an eased progress `alpha`.
 */
export type TransitionInterpolation<T> = (from: T, to: T, alpha: number) => T;

/**
 * The transition easing: either a cubic bezier tuple or a custom easing function.
 */
export type TransitionEasing = CubicBezierPoints | EasingFunction;

/**
 * Values that can be transitioned: a single number or a fixed-length number array.
 */
export type TransitionValue = number | number[];

/**
 * Common cubic bezier easing presets (same curves as CSS / VueUse).
 */
export const TransitionPresets = {
  linear: [0, 0, 1, 1],
  easeInSine: [0.12, 0, 0.39, 0],
  easeOutSine: [0.61, 1, 0.88, 1],
  easeInOutSine: [0.37, 0, 0.63, 1],
  easeInQuad: [0.11, 0, 0.5, 0],
  easeOutQuad: [0.5, 1, 0.89, 1],
  easeInOutQuad: [0.45, 0, 0.55, 1],
  easeInCubic: [0.32, 0, 0.67, 0],
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  easeInQuart: [0.5, 0, 0.75, 0],
  easeOutQuart: [0.25, 1, 0.5, 1],
  easeInOutQuart: [0.76, 0, 0.24, 1],
  easeInQuint: [0.64, 0, 0.78, 0],
  easeOutQuint: [0.22, 1, 0.36, 1],
  easeInOutQuint: [0.83, 0, 0.17, 1],
  easeInExpo: [0.7, 0, 0.84, 0],
  easeOutExpo: [0.16, 1, 0.3, 1],
  easeInOutExpo: [0.87, 0, 0.13, 1],
  easeInCirc: [0.55, 0, 1, 0.45],
  easeOutCirc: [0, 0.55, 0.45, 1],
  easeInOutCirc: [0.85, 0, 0.15, 1],
  easeInBack: [0.36, 0, 0.66, -0.56],
  easeOutBack: [0.34, 1.56, 0.64, 1],
  easeInOutBack: [0.68, -0.6, 0.32, 1.6],
} satisfies Record<string, CubicBezierPoints>;

export interface UseTransitionOptions {
  /**
   * Transition duration in milliseconds. Accepts a reactive value (resolved
   * at the start of each transition).
   *
   * @default 1000
   */
  duration?: MaybeRefOrGetter<number>;

  /**
   * Easing applied to the progress: a cubic bezier tuple (e.g. one of
   * {@link TransitionPresets}) or a custom easing function.
   *
   * @default identity (linear)
   */
  transition?: MaybeRefOrGetter<TransitionEasing>;

  /**
   * Delay in milliseconds before a transition begins after the source changes.
   *
   * @default 0
   */
  delay?: MaybeRefOrGetter<number>;

  /**
   * When `true`, transitions are skipped and the output tracks the source
   * value directly (no animation). Reactive.
   *
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean>;

  /**
   * Called when a transition starts.
   */
  onStarted?: () => void;

  /**
   * Called when a transition finishes (not called when aborted by a new change).
   */
  onFinished?: () => void;
}

export type UseTransitionReturn<T> = Readonly<Ref<T>>;

const identity: EasingFunction = n => n;

interface BezierCoefficients {
  a: (a1: number, a2: number) => number;
  b: (a1: number, a2: number) => number;
  c: (a1: number) => number;
}

function createEasingFunction(points: CubicBezierPoints): EasingFunction {
  const [p0, p1, p2, p3] = points;

  const coeffs: BezierCoefficients = {
    a: (a1, a2) => 1 - 3 * a2 + 3 * a1,
    b: (a1, a2) => 3 * a2 - 6 * a1,
    c: a1 => 3 * a1,
  };

  const calcBezier = (t: number, a1: number, a2: number): number =>
    ((coeffs.a(a1, a2) * t + coeffs.b(a1, a2)) * t + coeffs.c(a1)) * t;

  const getSlope = (t: number, a1: number, a2: number): number =>
    3 * coeffs.a(a1, a2) * t * t + 2 * coeffs.b(a1, a2) * t + coeffs.c(a1);

  const getTForX = (x: number): number => {
    let guess = x;

    for (let i = 0; i < 4; ++i) {
      const slope = getSlope(guess, p0, p2);

      if (slope === 0)
        return guess;

      const currentX = calcBezier(guess, p0, p2) - x;
      guess -= currentX / slope;
    }

    return guess;
  };

  return n => (p0 === p1 && p2 === p3) ? n : calcBezier(getTForX(n), p1, p3);
}

function resolveEasing(transition: TransitionEasing | undefined): EasingFunction {
  if (!transition)
    return identity;

  if (isFunction(transition))
    return transition;

  return createEasingFunction(transition);
}

// Interpolate a single number or a (fixed-length) numeric array.
function interpolate(from: TransitionValue, to: TransitionValue, alpha: number): TransitionValue {
  if (isNumber(from) && isNumber(to))
    return lerp(from, to, alpha);

  const source = from as number[];
  const target = to as number[];

  return source.map((value, index) => lerp(value, target[index] ?? value, alpha));
}

function snapshot<T extends TransitionValue>(value: T): T {
  return (isNumber(value) ? value : (value as number[]).slice()) as T;
}

function valuesEqual(a: TransitionValue, b: TransitionValue): boolean {
  if (isNumber(a) && isNumber(b))
    return a === b;

  if (isNumber(a) || isNumber(b))
    return false;

  if (a.length !== b.length)
    return false;

  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i])
      return false;
  }

  return true;
}

/**
 * @name useTransition
 * @category Animation
 * @description Reactively transition between numeric values (or numeric arrays)
 * over a duration with configurable easing. Wraps a single, paused
 * `requestAnimationFrame` loop that only runs while a transition is in flight,
 * so it is cheaper than re-creating an RAF loop per change. SSR-safe: without a
 * `window` the output tracks the source synchronously.
 *
 * @param {MaybeRefOrGetter<T>} source The reactive source value (number or number[])
 * @param {UseTransitionOptions & ConfigurableWindow} [options={}] Transition options
 * @returns {UseTransitionReturn<T>} A readonly ref of the transitioned value
 *
 * @example
 * const progress = ref(0);
 * const output = useTransition(progress, {
 *   duration: 500,
 *   transition: TransitionPresets.easeOutCubic,
 * });
 *
 * @example
 * // Transition a tuple (e.g. an RGB color)
 * const color = ref([0, 0, 0]);
 * const animated = useTransition(color, { duration: 1000 });
 *
 * @since 0.0.15
 */
export function useTransition<T extends TransitionValue>(
  source: MaybeRefOrGetter<T>,
  options: UseTransitionOptions & ConfigurableWindow = {},
): UseTransitionReturn<T> {
  const {
    duration = 1000,
    transition = identity,
    delay = 0,
    disabled = false,
    onStarted = noop,
    onFinished = noop,
  } = options;

  const window = 'window' in options ? options.window : defaultWindow;

  // The animated output. Seeded with a snapshot of the current source.
  const outputRef = ref(snapshot(toValue(source))) as Ref<T>;

  // Active-transition state. `endpoints` are detached snapshots so that later
  // source mutations cannot bleed into an in-flight transition.
  let fromValue: T = outputRef.value;
  let toValue_: T = outputRef.value;
  let startedAt = 0;
  let durationMs = 0;
  let easing: EasingFunction = identity;
  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  let finishPending = false;

  const { pause, resume, isActive } = useRafFn(tick, { immediate: false, window });

  function clearDelay() {
    if (delayTimer !== null && window) {
      window.clearTimeout(delayTimer);
      delayTimer = null;
    }
  }

  function settle(value: T) {
    outputRef.value = snapshot(value);

    if (isActive.value)
      pause();

    if (finishPending) {
      finishPending = false;
      onFinished();
    }
  }

  function tick() {
    const now = Date.now();
    const alpha = durationMs <= 0 ? 1 : clamp((now - startedAt) / durationMs, 0, 1);

    outputRef.value = interpolate(fromValue, toValue_, easing(alpha)) as T;

    if (alpha >= 1)
      settle(toValue_);
  }

  function begin(target: T) {
    fromValue = snapshot(outputRef.value);
    toValue_ = snapshot(target);

    durationMs = Math.max(0, toValue(duration));
    easing = resolveEasing(toValue(transition));
    startedAt = Date.now();
    finishPending = true;

    onStarted();

    if (durationMs <= 0 || !window) {
      settle(toValue_);
      return;
    }

    if (!isActive.value)
      resume();
  }

  function start(target: T) {
    clearDelay();

    const delayMs = Math.max(0, toValue(delay));

    if (delayMs > 0 && window) {
      delayTimer = window.setTimeout(() => {
        delayTimer = null;
        begin(target);
      }, delayMs);

      return;
    }

    begin(target);
  }

  watch(
    () => toValue(source),
    (value) => {
      // When disabled, mirror the source instantly and abort any animation.
      if (toValue(disabled)) {
        clearDelay();

        if (isActive.value)
          pause();

        finishPending = false;
        outputRef.value = snapshot(value);

        return;
      }

      // Skip no-op changes so we don't restart an identical transition.
      if (valuesEqual(value, outputRef.value) && !isActive.value && delayTimer === null)
        return;

      start(value);
    },
    { deep: true },
  );

  // Reacting to `disabled` flipping to true mid-transition: snap to source.
  watch(
    () => toValue(disabled),
    (off) => {
      if (off) {
        clearDelay();

        if (isActive.value)
          pause();

        finishPending = false;
        outputRef.value = snapshot(toValue(source));
      }
    },
  );

  return computed(() => outputRef.value);
}
