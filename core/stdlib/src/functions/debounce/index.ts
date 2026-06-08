import type { AnyFunction } from '../../types';

export interface DebounceOptions {
  /** Invoke on the leading edge of the timeout. Default `false`. */
  leading?: boolean;
  /** Invoke on the trailing edge of the timeout. Default `true`. */
  trailing?: boolean;
  /**
   * The maximum time `fn` is allowed to be delayed before it is forcibly
   * invoked, even while calls keep arriving. Accepts a number or a getter
   * resolved lazily. When omitted there is no upper bound.
   */
  maxWait?: number | (() => number);
}

export interface DebouncedFunction<T extends AnyFunction> {
  (this: ThisParameterType<T>, ...args: Parameters<T>): void;
  /** Cancel a pending invocation without calling the function. */
  cancel: () => void;
  /** Immediately invoke a pending call (if any) and return its result. */
  flush: () => ReturnType<T> | undefined;
  /** Whether an invocation is currently scheduled. */
  pending: () => boolean;
}

/**
 * @name debounce
 * @category Functions
 * @description Delays invoking a function until `wait` ms have elapsed since the last call
 *
 * @param {Function} fn - The function to debounce
 * @param {number | (() => number)} wait - Milliseconds to wait, or a getter resolved lazily on each call (useful for reactive delays)
 * @param {DebounceOptions} [options] - Leading/trailing edge behavior and `maxWait`
 * @returns {DebouncedFunction} The debounced function with `cancel()`, `flush()` and `pending()`
 *
 * @example
 * const onResize = debounce(() => layout(), 200);
 * window.addEventListener('resize', onResize);
 * onResize.cancel();
 *
 * @example
 * // Reactive delay + a guaranteed call at least every 1000ms under sustained input
 * const save = debounce(persist, () => delayRef.value, { maxWait: 1000 });
 *
 * @since 0.0.10
 */
export function debounce<T extends AnyFunction>(
  fn: T,
  wait: number | (() => number),
  options: DebounceOptions = {},
): DebouncedFunction<T> {
  const { leading = false, trailing = true, maxWait } = options;
  const resolveWait = typeof wait === 'function' ? wait : () => wait;
  const resolveMaxWait = maxWait === undefined
    ? undefined
    : (typeof maxWait === 'function' ? maxWait : () => maxWait);

  let timer: ReturnType<typeof setTimeout> | undefined;
  let maxTimer: ReturnType<typeof setTimeout> | undefined;
  let pending: (() => ReturnType<T>) | undefined;
  let result: ReturnType<T> | undefined;

  function invoke() {
    if (pending === undefined)
      return;

    result = pending();
    pending = undefined;
  }

  function clearTimers() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }

    if (maxTimer !== undefined) {
      clearTimeout(maxTimer);
      maxTimer = undefined;
    }
  }

  const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    // The arrow captures the call-time `this` lexically, no aliasing needed.
    pending = () => fn.apply(this, args) as ReturnType<T>;

    const callLeading = leading && timer === undefined && maxTimer === undefined;

    if (timer !== undefined)
      clearTimeout(timer);

    timer = setTimeout(() => {
      clearTimers();

      if (trailing)
        invoke();
    }, resolveWait());

    // maxWait: guarantee an invocation within maxWait of the burst's first call.
    if (resolveMaxWait !== undefined && maxTimer === undefined) {
      maxTimer = setTimeout(() => {
        clearTimers();
        invoke();
      }, resolveMaxWait());
    }

    if (callLeading)
      invoke();
  } as DebouncedFunction<T>;

  debounced.cancel = () => {
    clearTimers();
    pending = undefined;
  };

  debounced.flush = () => {
    if (timer !== undefined || maxTimer !== undefined) {
      clearTimers();
      invoke();
    }

    return result;
  };

  // True only when an invocation will actually occur: a maxWait flush is always honored,
  // but the trailing-edge timer fires fn only when `trailing` is enabled.
  debounced.pending = () => maxTimer !== undefined || (trailing && timer !== undefined);

  return debounced;
}
