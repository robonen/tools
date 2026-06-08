import { computed, markRaw, ref } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { isFunction, timestamp } from '@robonen/stdlib';
import { cloneFnDefault } from '@/composables/reactivity/useCloned';
import type { CloneFn } from '@/composables/reactivity/useCloned';

export interface UseRefHistoryRecord<T> {
  /**
   * The (optionally serialized) value captured at commit time.
   */
  snapshot: T;

  /**
   * Milliseconds since the Unix epoch when the record was created.
   */
  timestamp: number;
}

export interface UseManualRefHistoryOptions<Raw, Serialized = Raw> {
  /**
   * Maximum number of history records kept in the undo stack. When omitted the
   * stack grows without bound.
   */
  capacity?: number;

  /**
   * Clone the snapshot when committing. Pass `true` for the default deep clone
   * (`structuredClone` with a JSON fallback), or a custom clone function.
   *
   * @default false
   */
  clone?: boolean | CloneFn<Raw>;

  /**
   * Serialize the source value into a snapshot when committing. Defaults to the
   * clone function when `clone` is set, otherwise an identity passthrough.
   */
  dump?: (value: Raw) => Serialized;

  /**
   * Deserialize a snapshot back into a source value when restoring. Defaults to
   * the clone function when `clone` is set, otherwise an identity passthrough.
   */
  parse?: (value: Serialized) => Raw;

  /**
   * Write a restored value back to the source ref. Override to integrate with
   * custom writable sources.
   */
  setSource?: (source: Ref<Raw>, value: Raw) => void;
}

export interface UseManualRefHistoryReturn<Raw, Serialized> {
  /**
   * The tracked source ref.
   */
  source: Ref<Raw>;

  /**
   * All records, most recent first (the current `last` followed by the undo stack).
   */
  history: ComputedRef<Array<UseRefHistoryRecord<Serialized>>>;

  /**
   * The most recently committed record.
   */
  last: Ref<UseRefHistoryRecord<Serialized>>;

  /**
   * Records available to undo to, most recent first.
   */
  undoStack: Ref<Array<UseRefHistoryRecord<Serialized>>>;

  /**
   * Records available to redo to, most recent first.
   */
  redoStack: Ref<Array<UseRefHistoryRecord<Serialized>>>;

  /**
   * Whether there is at least one record to undo to.
   */
  canUndo: ComputedRef<boolean>;

  /**
   * Whether there is at least one record to redo to.
   */
  canRedo: ComputedRef<boolean>;

  /**
   * Capture the current source value as a new history record.
   */
  commit: () => void;

  /**
   * Drop every record from both stacks (keeps the current `last`).
   */
  clear: () => void;

  /**
   * Restore the previous record, moving the current one onto the redo stack.
   */
  undo: () => void;

  /**
   * Reapply the most recently undone record.
   */
  redo: () => void;

  /**
   * Restore the source to the value of the current `last` record.
   */
  reset: () => void;
}

type FnCloneOrBypass<F, T> = (value: F) => T;

function fnBypass<F, T>(value: F): T {
  return value as unknown as T;
}

function fnSetSource<T>(source: Ref<T>, value: T): void {
  source.value = value;
}

function resolveTransform<R, S>(clone?: boolean | CloneFn<R>): FnCloneOrBypass<R, S> {
  if (!clone)
    return fnBypass as FnCloneOrBypass<R, S>;

  return (isFunction(clone) ? clone : cloneFnDefault) as unknown as FnCloneOrBypass<R, S>;
}

/**
 * @name useManualRefHistory
 * @category State
 * @description Manually-committed undo/redo history for a ref. Records snapshots only when `commit()` is called, with optional cloning, serialization, and a bounded capacity.
 *
 * @param {Ref<Raw>} source The ref whose value changes are tracked
 * @param {UseManualRefHistoryOptions<Raw, Serialized>} [options={}] Options: `capacity`, `clone`, `dump`, `parse`, `setSource`
 * @returns {UseManualRefHistoryReturn<Raw, Serialized>} History state plus `commit`, `undo`, `redo`, `clear`, and `reset`
 *
 * @example
 * const count = ref(0);
 * const { history, commit, undo, redo, canUndo } = useManualRefHistory(count);
 * count.value = 1;
 * commit();
 * undo(); // count.value === 0
 *
 * @example
 * const state = ref({ items: [] });
 * const { commit, undo } = useManualRefHistory(state, { clone: true, capacity: 10 });
 *
 * @since 0.0.15
 */
export function useManualRefHistory<Raw, Serialized = Raw>(
  source: Ref<Raw>,
  options: UseManualRefHistoryOptions<Raw, Serialized> = {},
): UseManualRefHistoryReturn<Raw, Serialized> {
  const {
    capacity,
    clone = false,
    dump = resolveTransform<Raw, Serialized>(clone),
    parse = resolveTransform<Serialized, Raw>(clone as boolean | CloneFn<Serialized>),
    setSource = fnSetSource,
  } = options;

  function createRecord(): UseRefHistoryRecord<Serialized> {
    return markRaw({
      snapshot: dump(source.value),
      timestamp: timestamp(),
    });
  }

  const last = ref(createRecord()) as Ref<UseRefHistoryRecord<Serialized>>;
  const undoStack = ref([]) as Ref<Array<UseRefHistoryRecord<Serialized>>>;
  const redoStack = ref([]) as Ref<Array<UseRefHistoryRecord<Serialized>>>;

  function applyRecord(record: UseRefHistoryRecord<Serialized>): void {
    setSource(source, parse(record.snapshot));
    last.value = record;
  }

  function commit(): void {
    undoStack.value.unshift(last.value);
    last.value = createRecord();

    if (capacity && undoStack.value.length > capacity)
      undoStack.value.splice(capacity, Number.POSITIVE_INFINITY);

    if (redoStack.value.length)
      redoStack.value.splice(0, redoStack.value.length);
  }

  function clear(): void {
    undoStack.value.splice(0, undoStack.value.length);
    redoStack.value.splice(0, redoStack.value.length);
  }

  function undo(): void {
    const record = undoStack.value.shift();

    if (record) {
      redoStack.value.unshift(last.value);
      applyRecord(record);
    }
  }

  function redo(): void {
    const record = redoStack.value.shift();

    if (record) {
      undoStack.value.unshift(last.value);
      applyRecord(record);
    }
  }

  function reset(): void {
    applyRecord(last.value);
  }

  const history = computed<Array<UseRefHistoryRecord<Serialized>>>(() => [last.value, ...undoStack.value]);
  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  return {
    source,
    history,
    last,
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    commit,
    clear,
    undo,
    redo,
    reset,
  };
}
