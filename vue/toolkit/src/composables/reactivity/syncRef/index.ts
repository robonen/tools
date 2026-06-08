import type { Ref, WatchStopHandle } from 'vue';
import type { ConfigurableFlush } from '@/types';
import { watchIgnorable } from '@/composables/watch/watchIgnorable';

export type SyncRefDirection = 'ltr' | 'rtl' | 'both';

/**
 * Conversion functions used when the two refs hold different value types.
 *
 * - `ltr` maps a left value to a right value (used when the left ref changes).
 * - `rtl` maps a right value to a left value (used when the right ref changes).
 */
export interface SyncRefTransform<L, R> {
  /**
   * Transform a left value into a right value. Required for `ltr`/`both` when `L !== R`.
   */
  ltr?: (left: L) => R;
  /**
   * Transform a right value into a left value. Required for `rtl`/`both` when `L !== R`.
   */
  rtl?: (right: R) => L;
}

export interface SyncRefOptions<L, R> extends ConfigurableFlush {
  /**
   * Watch the refs deeply.
   *
   * @default false
   */
  deep?: boolean;
  /**
   * Sync the values immediately on setup (in the chosen direction).
   *
   * @default true
   */
  immediate?: boolean;
  /**
   * Direction of synchronization.
   *
   * - `both` keeps both refs in sync.
   * - `ltr` only propagates `left` -> `right`.
   * - `rtl` only propagates `right` -> `left`.
   *
   * @default 'both'
   */
  direction?: SyncRefDirection;
  /**
   * Conversion functions to apply when the refs hold different value types.
   * Provide `ltr` and/or `rtl` matching the active {@link SyncRefOptions.direction}.
   */
  transform?: SyncRefTransform<L, R>;
}

export interface SyncRefReturn {
  /**
   * Stop all underlying watchers. Synchronization cannot be resumed afterwards.
   */
  stop: WatchStopHandle;
}

const identity = <T>(value: T): T => value;
type IgnoredUpdater = (updater: () => void) => void;
const runDirect: IgnoredUpdater = updater => updater();

/**
 * @name syncRef
 * @category Reactivity
 * @description Keeps two refs in sync (two-way by default, or one-way via `direction`), with optional value transforms.
 *
 * @param {Ref<L>} left The left ref to synchronize
 * @param {Ref<R>} right The right ref to synchronize
 * @param {SyncRefOptions<L, R>} [options={}] `direction`, `transform`, `immediate`, `flush`, and `deep`
 * @returns {SyncRefReturn} `{ stop }` to tear down the synchronization
 *
 * @example
 * const left = ref('hello');
 * const right = ref('hello');
 * syncRef(left, right);
 *
 * left.value = 'world'; // right.value === 'world'
 * right.value = 'foo';  // left.value === 'foo'
 *
 * @example
 * // One-way with a transform (left number -> right string)
 * const count = ref(0);
 * const text = ref('0');
 * syncRef(count, text, {
 *   direction: 'ltr',
 *   transform: { ltr: value => String(value) },
 * });
 *
 * @since 0.0.15
 */
export function syncRef<L, R = L>(
  left: Ref<L>,
  right: Ref<R>,
  options: SyncRefOptions<L, R> = {},
): SyncRefReturn {
  const {
    flush = 'sync',
    deep = false,
    immediate = true,
    direction = 'both',
    transform = {},
  } = options;

  // Identity is the safe fallback when both refs share the same value type.
  const transformLTR = (transform.ltr ?? identity) as (left: L) => R;
  const transformRTL = (transform.rtl ?? identity) as (right: R) => L;

  const syncLTR = direction === 'both' || direction === 'ltr';
  const syncRTL = direction === 'both' || direction === 'rtl';

  // Each callback wraps its cross-write in the OPPOSITE watcher's
  // `ignoreUpdates` so a programmatic write never re-triggers the watcher that
  // observes the written ref — preventing feedback loops without pausing every
  // watcher on every change. The handles are bound after both watchers exist,
  // so callbacks read them through these late-bound slots.
  let ignoreLeftWrites: IgnoredUpdater = runDirect;
  let ignoreRightWrites: IgnoredUpdater = runDirect;

  const watchers: WatchStopHandle[] = [];

  if (syncLTR) {
    const { stop, ignoreUpdates } = watchIgnorable(
      left,
      (newValue) => {
        // Writing `right`; suppress the rtl watcher.
        ignoreRightWrites(() => {
          right.value = transformLTR(newValue as L);
        });
      },
      { flush, deep, immediate },
    );

    // Writes to `left` (done by the rtl watcher) must be ignored here.
    ignoreLeftWrites = ignoreUpdates;
    watchers.push(stop);
  }

  if (syncRTL) {
    // The ltr watcher already performed the initial sync, so a `both` setup
    // must not immediately back-sync (it would clobber `left` from `right`).
    const rtlImmediate = direction === 'rtl' ? immediate : false;

    const { stop, ignoreUpdates } = watchIgnorable(
      right,
      (newValue) => {
        // Writing `left`; suppress the ltr watcher.
        ignoreLeftWrites(() => {
          left.value = transformRTL(newValue as R);
        });
      },
      { flush, deep, immediate: rtlImmediate },
    );

    // Writes to `right` (done by the ltr watcher) must be ignored here.
    ignoreRightWrites = ignoreUpdates;
    watchers.push(stop);
  }

  const stop = (): void => {
    for (const stopWatcher of watchers) stopWatcher();
  };

  return { stop };
}
