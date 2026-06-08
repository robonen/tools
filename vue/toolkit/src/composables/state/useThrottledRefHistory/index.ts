import type { MaybeRefOrGetter, Ref } from 'vue';
import { useRefHistory } from '@/composables/state/useRefHistory';
import type { UseRefHistoryOptions, UseRefHistoryReturn } from '@/composables/state/useRefHistory';
import { throttleFilter } from '@/utils';

export type UseThrottledRefHistoryOptions<Raw, Serialized = Raw>
  = Omit<UseRefHistoryOptions<Raw, Serialized>, 'eventFilter'> & {
    /**
     * Throttle interval in milliseconds between committed snapshots.
     * Can be reactive — changes apply to subsequent commits.
     *
     * @default 200
     */
    throttle?: MaybeRefOrGetter<number>;
    /**
     * Commit a trailing snapshot after the throttle window elapses so the final
     * value of a burst is always recorded.
     *
     * @default true
     */
    trailing?: boolean;
    /**
     * Commit a leading snapshot at the start of a throttle window.
     *
     * @default true
     */
    leading?: boolean;
  };

export type UseThrottledRefHistoryReturn<Raw, Serialized = Raw>
  = UseRefHistoryReturn<Raw, Serialized>;

/**
 * @name useThrottledRefHistory
 * @category State
 * @description Shorthand for {@link useRefHistory} with a throttled event filter, so rapid source changes are committed at most once per interval (trailing edge by default).
 *
 * @param {Ref<Raw>} source The ref whose changes are tracked
 * @param {UseThrottledRefHistoryOptions<Raw, Serialized>} [options={}] Tracking options — all of {@link useRefHistory}'s except `eventFilter`, plus `throttle`, `trailing`, and `leading`
 * @returns {UseThrottledRefHistoryReturn<Raw, Serialized>} History records plus `undo`/`redo`/`commit`/`reset`/`clear`/`pause`/`resume`/`batch`/`dispose`
 *
 * @example
 * const count = ref(0);
 * const { history, undo, redo } = useThrottledRefHistory(count, { throttle: 1000 });
 *
 * count.value = 1;
 * count.value = 2;
 * count.value = 3; // collapsed into a single throttled commit
 *
 * @example
 * // Reactive interval and deep tracking
 * const ms = ref(500);
 * const state = ref({ items: [] });
 * const { history } = useThrottledRefHistory(state, { throttle: ms, deep: true });
 *
 * @since 0.0.15
 */
export function useThrottledRefHistory<Raw, Serialized = Raw>(
  source: Ref<Raw>,
  options: UseThrottledRefHistoryOptions<Raw, Serialized> = {},
): UseThrottledRefHistoryReturn<Raw, Serialized> {
  const { throttle = 200, trailing = true, leading = true } = options;

  const eventFilter = throttleFilter(throttle, trailing, leading);

  return useRefHistory(source, { ...options, eventFilter });
}
