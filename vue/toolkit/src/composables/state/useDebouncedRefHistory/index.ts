import type { MaybeRefOrGetter, Ref } from 'vue';
import { useRefHistory } from '@/composables/state/useRefHistory';
import type { UseRefHistoryOptions, UseRefHistoryReturn } from '@/composables/state/useRefHistory';
import { debounceFilter } from '@/utils/filters';

export interface UseDebouncedRefHistoryOptions<Raw, Serialized = Raw>
  extends Omit<UseRefHistoryOptions<Raw, Serialized>, 'eventFilter'> {
  /**
   * Debounce delay in milliseconds before a tracked change is committed to
   * history. Can be reactive. When `0`, `undefined`, or non-positive, changes
   * commit synchronously (no debouncing).
   *
   * @default undefined (no debounce)
   */
  debounce?: MaybeRefOrGetter<number>;
  /**
   * Maximum time a commit may be deferred while changes keep arriving. Once
   * exceeded, the pending change is forcibly committed even under sustained
   * input. Can be reactive. When omitted there is no upper bound.
   */
  maxWait?: MaybeRefOrGetter<number>;
}

export type UseDebouncedRefHistoryReturn<Raw, Serialized = Raw>
  = UseRefHistoryReturn<Raw, Serialized>;

/**
 * @name useDebouncedRefHistory
 * @category State
 * @description Track the change history of a ref, debouncing commits so that
 * rapid bursts of changes collapse into a single history record. A shorthand
 * for {@link useRefHistory} pre-wired with a debounce {@link EventFilter}.
 *
 * @param {Ref<Raw>} source The ref whose changes are tracked
 * @param {UseDebouncedRefHistoryOptions<Raw, Serialized>} [options={}] Tracking options (`debounce`, `maxWait`, plus all `useRefHistory` options except `eventFilter`)
 * @returns {UseDebouncedRefHistoryReturn<Raw, Serialized>} History records plus `undo`/`redo`/`commit`/`reset`/`clear`/`pause`/`resume`/`batch`/`dispose`
 *
 * @example
 * const count = ref(0);
 * const { history, undo, redo } = useDebouncedRefHistory(count, { debounce: 200 });
 *
 * // Rapid changes within 200ms collapse into a single commit
 * count.value = 1;
 * count.value = 2;
 * count.value = 3;
 * // after 200ms idle -> history has one new record with snapshot 3
 *
 * @example
 * // Bound the maximum deferral under sustained input
 * const text = ref('');
 * const { history } = useDebouncedRefHistory(text, { debounce: 300, maxWait: 1000 });
 *
 * @since 0.0.15
 */
export function useDebouncedRefHistory<Raw, Serialized = Raw>(
  source: Ref<Raw>,
  options: UseDebouncedRefHistoryOptions<Raw, Serialized> = {},
): UseDebouncedRefHistoryReturn<Raw, Serialized> {
  const { debounce, maxWait, ...historyOptions } = options;

  const eventFilter = debounce === undefined
    ? undefined
    : debounceFilter(debounce, { maxWait });

  return useRefHistory<Raw, Serialized>(source, {
    ...historyOptions,
    eventFilter,
  });
}
