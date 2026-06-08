import { computed, markRaw, ref, toRaw } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { isFunction } from '@robonen/stdlib';
import { watchIgnorable } from '@/composables/watch/watchIgnorable';
import type { UseRefHistoryRecord } from '@/composables/state/useManualRefHistory';
import type { ConfigurableFlush } from '@/types';
import type { ConfigurableEventFilter, EventFilter } from '@/utils';

export interface UseRefHistoryOptions<Raw, Serialized = Raw> extends ConfigurableEventFilter, ConfigurableFlush {
  /**
   * Watch for deep changes. When enabled, snapshots are cloned so nested
   * mutations are not shared between history records.
   *
   * @default false
   */
  deep?: boolean;
  /**
   * Maximum number of history records to retain (oldest are dropped first).
   * Defaults to unlimited.
   */
  capacity?: number;
  /**
   * Clone the value when taking a snapshot. Pass `true` for a structured deep
   * clone, or supply a custom clone function. Implied by `deep`.
   *
   * @default false
   */
  clone?: boolean | ((value: Raw) => Raw);
  /**
   * Serialize the raw value into the snapshot stored in history.
   *
   * @default identity (or a clone when `clone`/`deep` is enabled)
   */
  dump?: (value: Raw) => Serialized;
  /**
   * Deserialize a stored snapshot back into the raw value.
   *
   * @default identity
   */
  parse?: (value: Serialized) => Raw;
  /**
   * Determine whether a tracked change should be committed to history.
   *
   * @param oldValue Previous raw value
   * @param newValue New raw value
   * @returns `true` to record the change
   * @default () => true
   */
  shouldCommit?: (oldValue: Raw | undefined, newValue: Raw) => boolean;
}

export interface UseRefHistoryReturn<_Raw, Serialized> {
  /**
   * Bidirectional list of recorded snapshots, newest first
   */
  history: Ref<Array<UseRefHistoryRecord<Serialized>>>;
  /**
   * The most recent snapshot record
   */
  last: Ref<UseRefHistoryRecord<Serialized>>;
  /**
   * Undo history records (the redo stack), newest first
   */
  undoStack: Ref<Array<UseRefHistoryRecord<Serialized>>>;
  /**
   * Redo history records, newest first
   */
  redoStack: Ref<Array<UseRefHistoryRecord<Serialized>>>;
  /**
   * Whether change tracking is currently active
   */
  isTracking: Ref<boolean>;
  /**
   * Whether an undo operation is available
   */
  canUndo: ComputedRef<boolean>;
  /**
   * Whether a redo operation is available
   */
  canRedo: ComputedRef<boolean>;
  /**
   * Step the source back to the previous snapshot
   */
  undo: () => void;
  /**
   * Step the source forward to the next snapshot
   */
  redo: () => void;
  /**
   * Clear all recorded history (keeps the current value as the only record)
   */
  clear: () => void;
  /**
   * Manually record the current value as a new snapshot
   */
  commit: () => void;
  /**
   * Reset the source back to the most recent snapshot, discarding uncommitted changes
   */
  reset: () => void;
  /**
   * Pause change tracking
   */
  pause: () => void;
  /**
   * Resume change tracking
   *
   * @param commit If `true`, immediately record the current value after resuming
   */
  resume: (commit?: boolean) => void;
  /**
   * Run a function with tracking suspended, committing once on completion.
   * Call the provided `cancel` to skip the trailing commit.
   */
  batch: (fn: (cancel: () => void) => void) => void;
  /**
   * Stop the underlying watcher and clear all history
   */
  dispose: () => void;
}

const fnBypass = <T>(value: T): T => value;

const bypassEventFilter: EventFilter = (invoke) => {
  invoke();
};

function defaultDump<Raw, Serialized>(clone?: boolean | ((value: Raw) => Raw)): (value: Raw) => Serialized {
  if (!clone)
    return fnBypass as (value: Raw) => Serialized;

  const cloneFn = isFunction(clone)
    ? clone
    : (value: Raw): Raw => {
        // Unwrap reactive proxies before cloning — `structuredClone` chokes on them.
        const raw = toRaw(value);
        return typeof structuredClone === 'function'
          ? structuredClone(raw)
          : JSON.parse(JSON.stringify(raw));
      };

  return cloneFn as unknown as (value: Raw) => Serialized;
}

/**
 * @name useRefHistory
 * @category State
 * @description Track the change history of a ref with undo/redo, pause/resume, batching, and manual commits.
 *
 * @param {Ref<Raw>} source The ref whose changes are tracked
 * @param {UseRefHistoryOptions<Raw, Serialized>} [options={}] Tracking options (`deep`, `flush`, `capacity`, `clone`, `dump`, `parse`, `eventFilter`, `shouldCommit`)
 * @returns {UseRefHistoryReturn<Raw, Serialized>} History records plus `undo`/`redo`/`commit`/`reset`/`clear`/`pause`/`resume`/`batch`/`dispose`
 *
 * @example
 * const count = ref(0);
 * const { history, undo, redo, canUndo, canRedo } = useRefHistory(count);
 *
 * count.value = 1;
 * count.value = 2;
 * undo(); // count.value === 1
 * redo(); // count.value === 2
 *
 * @example
 * // Deep tracking with bounded capacity and a custom serializer
 * const state = ref({ items: [] });
 * const { history } = useRefHistory(state, { deep: true, capacity: 10 });
 *
 * @since 0.0.15
 */
export function useRefHistory<Raw, Serialized = Raw>(
  source: Ref<Raw>,
  options: UseRefHistoryOptions<Raw, Serialized> = {},
): UseRefHistoryReturn<Raw, Serialized> {
  const {
    deep = false,
    flush = 'pre',
    capacity,
    eventFilter,
    shouldCommit = () => true,
  } = options;

  const dump = options.dump ?? defaultDump<Raw, Serialized>(options.clone || deep);
  const parse = options.parse ?? (fnBypass as (value: Serialized) => Raw);

  const createRecord = (value: Raw): UseRefHistoryRecord<Serialized> =>
    markRaw({ snapshot: dump(value), timestamp: Date.now() });

  const last = ref(createRecord(source.value)) as Ref<UseRefHistoryRecord<Serialized>>;

  const undoStack = ref<Array<UseRefHistoryRecord<Serialized>>>([]) as Ref<Array<UseRefHistoryRecord<Serialized>>>;
  const redoStack = ref<Array<UseRefHistoryRecord<Serialized>>>([]) as Ref<Array<UseRefHistoryRecord<Serialized>>>;

  const history = computed<Array<UseRefHistoryRecord<Serialized>>>(() => [last.value, ...undoStack.value]);

  // Compose the user filter with a pause gate. When paused, tracked changes are
  // dropped entirely (rather than queued), matching VueUse's `pause` semantics.
  const isTracking = ref(true);
  const userFilter: EventFilter = eventFilter ?? bypassEventFilter;
  const composedFilter: EventFilter = (invoke) => {
    if (isTracking.value)
      userFilter(invoke);
  };

  // Last raw value used for the `shouldCommit` comparison.
  let lastRawValue: Raw | undefined = source.value;

  const { ignoreUpdates, ignorePrevAsyncUpdates, stop } = watchIgnorable(
    source,
    () => internalCommit(),
    { deep, flush, eventFilter: composedFilter },
  );

  function setSource(value: Raw): void {
    // Drop any async changes queued before this programmatic write so they do
    // not produce a spurious commit after an undo/redo/reset.
    ignorePrevAsyncUpdates();
    ignoreUpdates(() => {
      source.value = value;
      lastRawValue = value;
    });
  }

  function applyCapacity(): void {
    if (capacity === undefined)
      return;

    // `undoStack` holds everything except `last`, so the total kept is capacity.
    if (undoStack.value.length + 1 > capacity)
      undoStack.value.splice(capacity - 1, Number.POSITIVE_INFINITY);
  }

  function internalCommit(): void {
    ignorePrevAsyncUpdates();

    if (!shouldCommit(lastRawValue, source.value))
      return;

    lastRawValue = source.value;

    undoStack.value.unshift(last.value);
    last.value = createRecord(source.value);

    if (redoStack.value.length)
      redoStack.value.splice(0, redoStack.value.length);

    applyCapacity();
  }

  function commit(): void {
    internalCommit();
  }

  function undo(): void {
    const previous = undoStack.value.shift();

    if (!previous)
      return;

    redoStack.value.unshift(last.value);
    last.value = previous;
    setSource(parse(previous.snapshot));
  }

  function redo(): void {
    const next = redoStack.value.shift();

    if (!next)
      return;

    undoStack.value.unshift(last.value);
    last.value = next;
    setSource(parse(next.snapshot));
  }

  function reset(): void {
    ignorePrevAsyncUpdates();

    if (redoStack.value.length)
      redoStack.value.splice(0, redoStack.value.length);

    setSource(parse(last.value.snapshot));
  }

  function clear(): void {
    undoStack.value.splice(0, undoStack.value.length);
    redoStack.value.splice(0, redoStack.value.length);
  }

  function pause(): void {
    isTracking.value = false;
  }

  function resume(commitNow?: boolean): void {
    isTracking.value = true;
    if (commitNow)
      commit();
  }

  function batch(fn: (cancel: () => void) => void): void {
    let canceled = false;
    const cancel = (): void => {
      canceled = true;
    };

    ignoreUpdates(() => {
      fn(cancel);
    });

    if (!canceled)
      commit();
  }

  function dispose(): void {
    stop();
    clear();
  }

  const canUndo = computed<boolean>(() => undoStack.value.length > 0);
  const canRedo = computed<boolean>(() => redoStack.value.length > 0);

  return {
    history,
    last,
    undoStack,
    redoStack,
    isTracking: isTracking as Ref<boolean>,
    canUndo,
    canRedo,
    undo,
    redo,
    clear,
    commit,
    reset,
    pause,
    resume,
    batch,
    dispose,
  };
}
