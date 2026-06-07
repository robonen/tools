import { ref, shallowReadonly, watch } from 'vue';
import type {
  MultiWatchSources,
  Ref,
  WatchCallback,
  WatchOptions,
  WatchSource,
  WatchStopHandle,
} from 'vue';
import { bypassFilter, createFilterWrapper } from '@/utils/filters';
import type { ConfigurableEventFilter, EventFilter } from '@/utils/filters';

type MapSources<T> = {
  [K in keyof T]: T[K] extends WatchSource<infer V> ? V : never;
};

type MapOldSources<T, Immediate> = {
  [K in keyof T]: T[K] extends WatchSource<infer V>
    ? Immediate extends true ? V | undefined : V
    : never;
};

export interface UseWatchPausableOptions<Immediate>
  extends WatchOptions<Immediate>, ConfigurableEventFilter {
  /**
   * Whether the watcher starts in an active (running) or paused state.
   *
   * @default 'active'
   */
  initialState?: 'active' | 'paused';
}

export interface UseWatchPausableReturn {
  /**
   * Whether the watcher is currently active. While `false`, source changes are
   * ignored and the callback is not invoked.
   */
  isActive: Readonly<Ref<boolean>>;
  /**
   * Pause the watcher. Changes to the source are ignored until {@link resume}.
   */
  pause: () => void;
  /**
   * Resume the watcher so it reacts to source changes again.
   */
  resume: () => void;
  /**
   * Stop the watcher entirely. It cannot be restarted afterwards.
   */
  stop: WatchStopHandle;
}

/**
 * @name watchPausable
 * @category Reactivity
 * @description A `watch` whose execution can be paused and resumed on demand via a pausable event filter.
 *
 * @param {WatchSource | WatchSource[] | object} source The watch source (ref, getter, reactive object, or an array of sources)
 * @param {WatchCallback} cb The callback invoked when an active source changes
 * @param {UseWatchPausableOptions} [options={}] Watch options plus `eventFilter` and `initialState`
 * @returns {UseWatchPausableReturn} `{ stop, pause, resume, isActive }`
 *
 * @example
 * const count = ref(0);
 * const { pause, resume, isActive } = watchPausable(count, (value) => {
 *   console.log('changed to', value);
 * });
 *
 * pause();
 * count.value++; // callback not called
 * resume();
 * count.value++; // callback called
 *
 * @since 0.0.15
 */
export function watchPausable<T extends Readonly<MultiWatchSources>, Immediate extends Readonly<boolean> = false>(
  sources: [...T],
  cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>,
  options?: UseWatchPausableOptions<Immediate>,
): UseWatchPausableReturn;
export function watchPausable<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T>,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: UseWatchPausableOptions<Immediate>,
): UseWatchPausableReturn;
export function watchPausable<T extends object, Immediate extends Readonly<boolean> = false>(
  source: T,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: UseWatchPausableOptions<Immediate>,
): UseWatchPausableReturn;
export function watchPausable<Immediate extends Readonly<boolean> = false>(
  source: any,
  cb: any,
  options: UseWatchPausableOptions<Immediate> = {},
): UseWatchPausableReturn {
  const {
    eventFilter: filter = bypassFilter,
    initialState = 'active',
    ...watchOptions
  } = options;

  const isActive = ref(initialState !== 'paused');

  const eventFilter: EventFilter = (invoke) => {
    if (isActive.value)
      filter(invoke);
  };

  const stop = watch(
    source,
    createFilterWrapper(eventFilter, cb),
    watchOptions,
  );

  return {
    isActive: shallowReadonly(isActive),
    pause: () => { isActive.value = false; },
    resume: () => { isActive.value = true; },
    stop,
  };
}

/**
 * Alias for {@link watchPausable}.
 */
export const pausableWatch = watchPausable;
