import type { AnyFunction } from '../../types';

export interface ThrottleOptions {
  /** Invoke on the leading edge of the window. Default `true`. */
  leading?: boolean;
  /** Invoke on the trailing edge of the window. Default `true`. */
  trailing?: boolean;
}

export interface ThrottledFunction<T extends AnyFunction> {
  (this: ThisParameterType<T>, ...args: Parameters<T>): void;
  /** Cancel a pending trailing invocation. */
  cancel: () => void;
  /** Immediately invoke a pending call (if any) and return its result. */
  flush: () => ReturnType<T> | undefined;
  /** Whether a trailing invocation is currently scheduled. */
  pending: () => boolean;
}

/**
 * @name throttle
 * @category Functions
 * @description Invokes a function at most once per `wait` ms
 *
 * @param {Function} fn - The function to throttle
 * @param {number | (() => number)} wait - Milliseconds to throttle to, or a getter resolved lazily on each call (useful for reactive windows)
 * @param {ThrottleOptions} [options] - Leading/trailing edge behavior
 * @returns {ThrottledFunction} The throttled function with `cancel()`, `flush()` and `pending()`
 *
 * @example
 * const onScroll = throttle(() => update(), 100);
 * window.addEventListener('scroll', onScroll);
 *
 * @since 0.0.10
 */
export function throttle<T extends AnyFunction>(fn: T, wait: number | (() => number), options: ThrottleOptions = {}): ThrottledFunction<T> {
  const { leading = true, trailing = true } = options;
  const resolveWait = typeof wait === 'function' ? wait : () => wait;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: (() => ReturnType<T>) | undefined;
  let result: ReturnType<T> | undefined;
  let lastInvokeTime = 0;

  function invoke(time: number) {
    if (pending === undefined)
      return;

    lastInvokeTime = time;
    result = pending();
    pending = undefined;
  }

  const throttled = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const now = Date.now();
    const wait = resolveWait();

    // Skip the leading call by pretending we just invoked.
    if (lastInvokeTime === 0 && !leading)
      lastInvokeTime = now;

    const remaining = wait - (now - lastInvokeTime);

    // The arrow captures the call-time `this` lexically, no aliasing needed.
    pending = () => fn.apply(this, args) as ReturnType<T>;

    // Outside the window (or the clock jumped): invoke right away.
    if (remaining <= 0 || remaining > wait) {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }

      invoke(now);
    }
    else if (timer === undefined && trailing) {
      timer = setTimeout(() => {
        timer = undefined;
        invoke(leading ? Date.now() : 0);
      }, remaining);
    }
  } as ThrottledFunction<T>;

  throttled.cancel = () => {
    if (timer !== undefined)
      clearTimeout(timer);

    timer = undefined;
    pending = undefined;
    lastInvokeTime = 0;
  };

  throttled.flush = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
      invoke(Date.now());
    }

    return result;
  };

  throttled.pending = () => timer !== undefined;

  return throttled;
}
