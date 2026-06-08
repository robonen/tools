import { shallowReadonly, shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { debounce } from '@robonen/stdlib';
import type { AnyFunction } from '@robonen/stdlib';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseDebounceFnOptions {
  /**
   * The maximum time `fn` is allowed to be delayed before it is forcibly
   * invoked, even if calls keep arriving. Guarantees progress under sustained
   * input. When omitted there is no upper bound.
   *
   * @default undefined
   */
  maxWait?: number;

  /**
   * Reject the pending promise (instead of silently resolving it) when a call
   * is cancelled — either explicitly via `cancel()` or implicitly when a newer
   * call supersedes it.
   *
   * @default false
   */
  rejectOnCancel?: boolean;
}

export interface UseDebounceFnReturn<T extends AnyFunction> {
  /**
   * Invoke the debounced function. Returns a promise that resolves with the
   * wrapped function's result once the trailing edge fires. Superseded calls
   * resolve with `undefined` (or reject when `rejectOnCancel` is set).
   */
  (this: ThisParameterType<T>, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>>;

  /**
   * Cancel the pending invocation, if any.
   */
  cancel: () => void;

  /**
   * Immediately invoke the pending call (if any) ahead of its timer.
   */
  flush: () => void;

  /**
   * Whether a debounced invocation is currently scheduled.
   */
  readonly isPending: Readonly<Ref<boolean>>;
}

/**
 * @name useDebounceFn
 * @category Reactivity
 * @description Debounce execution of a function — a thin reactive wrapper around
 * `@robonen/stdlib`'s `debounce`. Postpones invocation until `ms` have elapsed
 * since the last call and resolves with the wrapped function's result. Supports
 * a reactive delay, a `maxWait` ceiling, `rejectOnCancel`, and exposes `cancel`,
 * `flush`, and `isPending`. Pending timers are cleared on scope dispose.
 *
 * @param {T} fn The function to debounce
 * @param {MaybeRefOrGetter<number>} [ms=200] Delay in milliseconds (can be reactive)
 * @param {UseDebounceFnOptions} [options] Debounce options (`maxWait`, `rejectOnCancel`)
 * @returns {UseDebounceFnReturn<T>} The debounced function with `cancel`, `flush`, and `isPending`
 *
 * @example
 * const search = useDebounceFn(() => fetchResults(query.value), 300);
 * watch(query, search);
 *
 * @example
 * const save = useDebounceFn(persist, 300, { maxWait: 1000 });
 * save.cancel();
 * save.flush();
 * if (save.isPending.value) {}
 *
 * @since 0.0.15
 */
export function useDebounceFn<T extends AnyFunction>(
  fn: T,
  ms: MaybeRefOrGetter<number> = 200,
  options: UseDebounceFnOptions = {},
): UseDebounceFnReturn<T> {
  const { maxWait, rejectOnCancel = false } = options;

  const isPending = shallowRef(false);

  // The latest unresolved promise settler; superseded ones are settled early.
  let settler: { resolve: (value?: unknown) => void; reject: (reason?: unknown) => void } | undefined;

  function settleCancelled() {
    const pending = settler;
    settler = undefined;

    if (!pending)
      return;

    if (rejectOnCancel)
      pending.reject();
    else
      pending.resolve(undefined);
  }

  // The function stdlib debounces: runs `fn` and settles the latest promise.
  function run(this: ThisParameterType<T>, ...args: Parameters<T>) {
    isPending.value = false;
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

  const debounced = debounce(run as AnyFunction, () => toValue(ms), { maxWait, leading: false, trailing: true });

  const wrapper = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      // A new call supersedes the previous pending promise.
      settleCancelled();
      settler = { resolve: resolve as (value?: unknown) => void, reject };

      const duration = toValue(ms);

      // Fast path: non-positive delay (or maxWait) runs synchronously.
      if (duration <= 0 || (maxWait !== undefined && maxWait <= 0)) {
        debounced.cancel();
        isPending.value = false;
        run.apply(this, args);
        return;
      }

      isPending.value = true;
      debounced.apply(this, args);
    });
  } as UseDebounceFnReturn<T>;

  wrapper.cancel = () => {
    debounced.cancel();
    isPending.value = false;
    settleCancelled();
  };

  wrapper.flush = () => {
    // stdlib flush synchronously runs `run`, which settles + clears isPending.
    debounced.flush();
  };

  tryOnScopeDispose(wrapper.cancel);

  return Object.assign(wrapper, { isPending: shallowReadonly(isPending) }) as UseDebounceFnReturn<T>;
}
