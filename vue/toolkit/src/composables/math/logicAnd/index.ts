import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type LogicAndReturn = ComputedRef<boolean>;

/**
 * @name logicAnd
 * @category Math
 * @description Reactive logical `AND` across boolean refs or getters. The result is `true` only when every input resolves to a truthy value.
 *
 * @param {...MaybeRefOrGetter<unknown>} args The boolean refs or getters to combine
 * @returns {LogicAndReturn} A readonly computed that is `true` only when every input is truthy
 *
 * @example
 * const a = ref(true);
 * const b = ref(false);
 * const all = logicAnd(a, b);
 * // all.value === false
 *
 * @example
 * const isReady = ref(true);
 * const hasAccess = computed(() => true);
 * const canProceed = logicAnd(isReady, hasAccess, () => true);
 * // canProceed.value === true
 *
 * @since 0.0.15
 */
export function logicAnd(...args: Array<MaybeRefOrGetter<unknown>>): LogicAndReturn {
  return computed(() => args.every(arg => Boolean(toValue(arg))));
}

/**
 * Alias for {@link logicAnd}.
 *
 * @since 0.0.15
 */
export const and: typeof logicAnd = logicAnd;
