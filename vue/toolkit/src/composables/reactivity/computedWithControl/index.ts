import { customRef, watch } from 'vue';
import type {
  ComputedGetter,
  ComputedRef,
  WatchOptions,
  WatchSource,
  WatchStopHandle,
  WritableComputedOptions,
  WritableComputedRef,
} from 'vue';

type MultiWatchSources = Array<WatchSource<unknown> | object>;

export interface ComputedWithControlExtra<T> {
  /**
   * Force the computed value to recompute on next access and notify subscribers.
   */
  trigger: () => void;

  /**
   * Read the current value without recomputing or registering reactive tracking.
   *
   * Returns the last cached value. If the value has never been computed it is
   * computed once (lazily) without tracking.
   */
  peek: () => T;

  /**
   * Stop watching the controlled dependency source.
   *
   * After calling this the value only updates via {@link ComputedWithControlExtra.trigger} or a manual set.
   */
  stop: WatchStopHandle;
}

export type ComputedRefWithControl<T>
  = ComputedRef<T> & ComputedWithControlExtra<T>;

export type WritableComputedRefWithControl<T>
  = WritableComputedRef<T> & ComputedWithControlExtra<T>;

export type ComputedWithControlRef<T>
  = ComputedRefWithControl<T> | WritableComputedRefWithControl<T>;

/**
 * @name computedWithControl
 * @category Reactivity
 * @description A computed ref whose recomputation is driven only by an
 * explicitly declared dependency `source`, plus a manual `.trigger()`. Built on
 * `customRef` with a single `flush: 'sync'` watcher and a lazy `dirty` flag, so
 * the getter is cached and only re-runs when the source changes or you trigger
 * it — never on unrelated reactive reads. Also exposes `.peek()` (untracked
 * read) and `.stop()` (detach the source watcher).
 *
 * @param {WatchSource | MultiWatchSources} source The dependency (or array of dependencies) that controls recomputation
 * @param {ComputedGetter<T> | WritableComputedOptions<T>} fn A getter, or a `{ get, set }` object for a writable computed
 * @param {WatchOptions} [options={}] Watch options forwarded to the internal watcher (`flush` defaults to `'sync'`)
 * @returns {ComputedWithControlRef<T>} A computed ref extended with `trigger`/`peek`/`stop`
 *
 * @example
 * const source = ref(0);
 * const unrelated = ref('a');
 * // only recomputes when `source` changes, not when `unrelated` does
 * const result = computedWithControl(source, () => source.value + unrelated.value.length);
 *
 * @example
 * // manual control: recompute on demand
 * let counter = 0;
 * const value = computedWithControl(() => {}, () => counter);
 * counter = 10;
 * value.trigger(); // value.value is now 10
 *
 * @example
 * // writable computed with controlled dependency
 * const base = ref(1);
 * const doubled = computedWithControl(base, {
 *   get: () => base.value * 2,
 *   set: (v) => { base.value = v / 2; },
 * });
 *
 * @since 0.0.15
 */
export function computedWithControl<T>(
  source: WatchSource | MultiWatchSources,
  fn: ComputedGetter<T>,
  options?: WatchOptions,
): ComputedRefWithControl<T>;
export function computedWithControl<T>(
  source: WatchSource | MultiWatchSources,
  fn: WritableComputedOptions<T>,
  options?: WatchOptions,
): WritableComputedRefWithControl<T>;
export function computedWithControl<T>(
  source: WatchSource | MultiWatchSources,
  fn: ComputedGetter<T> | WritableComputedOptions<T>,
  options: WatchOptions = {},
): ComputedWithControlRef<T> {
  let value: T = undefined!;
  let dirty = true;
  let track: () => void = noopTrack;
  let trigger: () => void = noopTrigger;

  const get = isGetter(fn) ? fn : fn.get;
  const set = isGetter(fn) ? undefined : fn.set;

  function compute(): T {
    if (dirty) {
      value = get(value);
      dirty = false;
    }

    return value;
  }

  function update(): void {
    dirty = true;
    trigger();
  }

  const stop = watch(source, update, { flush: 'sync', ...options });

  const result = customRef<T>((_track, _trigger) => {
    track = _track;
    trigger = _trigger;

    return {
      get() {
        const next = compute();
        track();

        return next;
      },
      set(incoming) {
        set?.(incoming);
      },
    };
  }) as ComputedWithControlRef<T>;

  result.trigger = update;
  result.peek = compute;
  result.stop = stop;

  return result;
}

function isGetter<T>(
  fn: ComputedGetter<T> | WritableComputedOptions<T>,
): fn is ComputedGetter<T> {
  return typeof fn === 'function';
}

function noopTrack(): void {}
function noopTrigger(): void {}

/**
 * @name controlledComputed
 * @category Reactivity
 * @description Alias of {@link computedWithControl}.
 *
 * @since 0.0.15
 */
export const controlledComputed = computedWithControl;
