import { noop } from '@robonen/stdlib';
import { computed, ref as deepRef, isRef, shallowRef, watchEffect } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { ConfigurableFlush } from '@/types';

/**
 * Handle overlapping async evaluations.
 *
 * The provided callback is invoked when a re-evaluation of the computed value
 * is triggered before the previous one finished, letting you abort stale work.
 */
export type AsyncComputedOnCancel = (cancelCallback: () => void) => void;

export interface UseComputedAsyncOptions<Lazy = boolean> extends ConfigurableFlush {
  /**
   * Should the value be evaluated lazily, i.e. only on first read.
   *
   * @default false
   */
  lazy?: Lazy;

  /**
   * Ref that receives the in-flight state of the async evaluation.
   * `true` while the callback is pending, `false` once it settles.
   */
  evaluating?: Ref<boolean>;

  /**
   * Use `shallowRef` instead of a deep `ref` to back the resolved value.
   *
   * @default true
   */
  shallow?: boolean;

  /**
   * Callback invoked when the evaluation callback throws or rejects.
   *
   * @default noop
   */
  onError?: (error: unknown) => void;
}

export type UseComputedAsyncReturn<T>
  = Ref<T> | ComputedRef<T>;

/**
 * @name computedAsync
 * @category Reactivity
 * @description Computed value driven by an async (promise-returning) evaluation
 * callback. The value updates reactively when its dependencies change, exposing
 * an optional `evaluating` ref for pending state, an `onError` handler, lazy
 * evaluation, and a default value used until the first resolution settles.
 * Out-of-order resolutions are discarded so only the latest run wins, and an
 * `onCancel` hook lets callbacks abort stale work.
 *
 * @param {(onCancel: AsyncComputedOnCancel) => T | Promise<T>} evaluationCallback Promise-returning function producing the value
 * @param {T} [initialState] Value used until the first evaluation resolves
 * @param {UseComputedAsyncOptions | Ref<boolean>} [optionsOrRef] Options object, or a `Ref<boolean>` used as the `evaluating` ref
 * @returns {Ref<T> | ComputedRef<T>} A ref holding the latest resolved value (a `ComputedRef` when `lazy`)
 *
 * @example
 * const id = ref(1);
 * const user = computedAsync(async () => {
 *   const res = await fetch(`/api/users/${id.value}`);
 *   return res.json();
 * }, null);
 *
 * @example
 * const evaluating = ref(false);
 * const data = computedAsync(async () => fetchData(), [], { evaluating });
 * // evaluating.value is true while the promise is pending
 *
 * @example
 * // Abort stale requests when dependencies change mid-flight
 * const result = computedAsync(async (onCancel) => {
 *   const controller = new AbortController();
 *   onCancel(() => controller.abort());
 *   const res = await fetch(url.value, { signal: controller.signal });
 *   return res.json();
 * }, undefined, { lazy: true });
 *
 * @since 0.0.15
 */
export function computedAsync<T>(
  evaluationCallback: (onCancel: AsyncComputedOnCancel) => T | Promise<T>,
  initialState: T,
  optionsOrRef: UseComputedAsyncOptions<true>,
): ComputedRef<T>;
export function computedAsync<T>(
  evaluationCallback: (onCancel: AsyncComputedOnCancel) => T | Promise<T>,
  initialState: undefined,
  optionsOrRef: UseComputedAsyncOptions<true>,
): ComputedRef<T | undefined>;
export function computedAsync<T>(
  evaluationCallback: (onCancel: AsyncComputedOnCancel) => T | Promise<T>,
  initialState: T,
  optionsOrRef?: Ref<boolean> | UseComputedAsyncOptions,
): Ref<T>;
export function computedAsync<T>(
  evaluationCallback: (onCancel: AsyncComputedOnCancel) => T | Promise<T>,
  initialState?: undefined,
  optionsOrRef?: Ref<boolean> | UseComputedAsyncOptions,
): Ref<T | undefined>;
export function computedAsync<T>(
  evaluationCallback: (onCancel: AsyncComputedOnCancel) => T | Promise<T>,
  initialState?: T,
  optionsOrRef?: Ref<boolean> | UseComputedAsyncOptions,
): UseComputedAsyncReturn<T> | UseComputedAsyncReturn<T | undefined> {
  const options: UseComputedAsyncOptions = isRef(optionsOrRef)
    ? { evaluating: optionsOrRef }
    : optionsOrRef ?? {};

  const {
    lazy = false,
    flush = 'pre',
    evaluating,
    shallow = true,
    onError = noop,
  } = options;

  const started = shallowRef(!lazy);
  const current = (shallow ? shallowRef(initialState) : deepRef(initialState)) as Ref<T>;
  let counter = 0;

  watchEffect(async (onInvalidate) => {
    if (!started.value)
      return;

    const runId = ++counter;
    let hasFinished = false;

    // Defer flipping `evaluating` to true so it is not tracked as a dependency
    // of this effect (which would cause an infinite re-run loop).
    if (evaluating) {
      Promise.resolve().then(() => {
        evaluating.value = true;
      });
    }

    try {
      const result = await evaluationCallback((cancelCallback) => {
        onInvalidate(() => {
          if (evaluating)
            evaluating.value = false;

          if (!hasFinished)
            cancelCallback();
        });
      });

      // Discard out-of-order resolutions: only the latest run commits.
      if (runId === counter)
        current.value = result;
    }
    catch (error) {
      onError(error);
    }
    finally {
      if (evaluating && runId === counter)
        evaluating.value = false;

      hasFinished = true;
    }
  }, { flush });

  if (lazy) {
    return computed(() => {
      started.value = true;
      return current.value;
    });
  }

  return current;
}

/**
 * @name asyncComputed
 * @category Reactivity
 * @description Alias for {@link computedAsync}.
 *
 * @since 0.0.15
 */
export const asyncComputed = computedAsync;
