import { isRef, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { isFunction, isObject, throttle } from '@robonen/stdlib';
import type { AnyFunction } from '@robonen/stdlib';

export interface UseThrottleFnOptions {
  /**
   * The window in milliseconds in which `fn` is invoked at most once.
   * For event callbacks, values around 100–250 (or higher) are most useful.
   *
   * @default 200
   */
  delay?: MaybeRefOrGetter<number>;

  /**
   * Invoke `fn` again on the trailing edge of the window with the most
   * recent arguments.
   *
   * @default false
   */
  trailing?: boolean;

  /**
   * Invoke `fn` on the leading edge of the window.
   *
   * @default true
   */
  leading?: boolean;

  /**
   * Reject the promise of a trailing call when it is superseded by a newer
   * call or cancelled, instead of silently resolving it.
   *
   * @default false
   */
  rejectOnCancel?: boolean;
}

export type UseThrottleFnReturn<T extends AnyFunction>
  = ((this: ThisParameterType<T>, ...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>) & {
    /**
     * Cancel a pending trailing invocation. Resolves (or rejects, when
     * `rejectOnCancel` is set) the pending promise without calling `fn`.
     */
    cancel: () => void;

    /**
     * Immediately invoke any pending trailing call, resolving its promise.
     */
    flush: () => void;
  };

function normalizeOptions(
  ms: MaybeRefOrGetter<number> | UseThrottleFnOptions,
  trailing: boolean,
  leading: boolean,
  rejectOnCancel: boolean,
): Required<UseThrottleFnOptions> {
  // Distinguish an options object from a reactive delay (ref/getter/number).
  if (isObject(ms) && !isRef(ms) && !isFunction(ms)) {
    const options = ms as UseThrottleFnOptions;

    return {
      delay: options.delay ?? 200,
      trailing: options.trailing ?? false,
      leading: options.leading ?? true,
      rejectOnCancel: options.rejectOnCancel ?? false,
    };
  }

  return { delay: ms, trailing, leading, rejectOnCancel };
}

/**
 * @name useThrottleFn
 * @category Utilities
 * @description Throttle execution of a function — a thin reactive wrapper around
 * `@robonen/stdlib`'s `throttle`. Invokes `fn` at most once per `delay` window
 * and resolves with the wrapped function's result. Especially useful for
 * rate-limiting handlers on high-frequency events like `scroll` and `resize`.
 *
 * Accepts either positional arguments or a single options object, and exposes
 * `cancel`/`flush` controls on the returned function.
 *
 * @param {T} fn The function to throttle
 * @param {MaybeRefOrGetter<number> | UseThrottleFnOptions} [ms=200] Window in milliseconds (can be reactive) or an options object
 * @param {boolean} [trailing=false] Invoke on the trailing edge of the window
 * @param {boolean} [leading=true] Invoke on the leading edge of the window
 * @param {boolean} [rejectOnCancel=false] Reject a superseded/cancelled trailing promise instead of resolving it
 * @returns {UseThrottleFnReturn<T>} The throttled function with `cancel` and `flush`
 *
 * @example
 * const onScroll = useThrottleFn(() => updatePosition(), 100);
 * useEventListener('scroll', onScroll);
 *
 * @example
 * const save = useThrottleFn(persist, { delay: 1000, trailing: true });
 * save.cancel();
 *
 * @since 0.0.15
 */
export function useThrottleFn<T extends AnyFunction>(
  fn: T,
  options: UseThrottleFnOptions,
): UseThrottleFnReturn<T>;
export function useThrottleFn<T extends AnyFunction>(
  fn: T,
  ms?: MaybeRefOrGetter<number>,
  trailing?: boolean,
  leading?: boolean,
  rejectOnCancel?: boolean,
): UseThrottleFnReturn<T>;
export function useThrottleFn<T extends AnyFunction>(
  fn: T,
  ms: MaybeRefOrGetter<number> | UseThrottleFnOptions = 200,
  trailing = false,
  leading = true,
  rejectOnCancel = false,
): UseThrottleFnReturn<T> {
  const { delay, trailing: useTrailing, leading: useLeading, rejectOnCancel: useReject }
    = normalizeOptions(ms, trailing, leading, rejectOnCancel);

  // The latest unsettled promise; superseded/dropped ones are settled early.
  let settler: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void } | undefined;
  let invokedSync = false;

  function settleCancelled() {
    const pending = settler;
    settler = undefined;

    if (!pending)
      return;

    if (useReject)
      pending.reject(new Error('throttled call cancelled'));
    else
      pending.resolve(undefined);
  }

  // The function stdlib throttles: runs `fn` and settles the latest promise.
  function run(this: ThisParameterType<T>, ...args: Parameters<T>) {
    invokedSync = true;
    const pending = settler;
    settler = undefined;

    try {
      const result = fn.apply(this, args) as Awaited<ReturnType<T>>;
      pending?.resolve(result);
      return result;
    }
    catch (error) {
      pending?.reject(error);
      return undefined;
    }
  }

  const throttled = throttle(run as AnyFunction, () => toValue(delay), { leading: useLeading, trailing: useTrailing });

  const wrapper = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      // A new call supersedes the previous pending (trailing) promise.
      settleCancelled();
      settler = { resolve: resolve as (value?: unknown) => void, reject };
      invokedSync = false;

      throttled.apply(this, args);

      // If this call neither fired synchronously (leading) nor scheduled a
      // trailing edge, it was dropped — settle its promise now to avoid a leak.
      if (!invokedSync && !throttled.pending())
        settleCancelled();
    });
  } as UseThrottleFnReturn<T>;

  wrapper.cancel = () => {
    throttled.cancel();
    settleCancelled();
  };

  wrapper.flush = () => {
    throttled.flush();
  };

  return wrapper;
}
