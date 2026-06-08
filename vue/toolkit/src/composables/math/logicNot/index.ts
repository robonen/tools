import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type LogicNotReturn = ComputedRef<boolean>;

/**
 * @name logicNot
 * @category Math
 * @description Reactive logical `NOT` of a boolean ref or getter. The result is `true` whenever the input resolves to a falsy value.
 *
 * @param {MaybeRefOrGetter<unknown>} v The boolean ref or getter to negate
 * @returns {LogicNotReturn} A readonly computed that is `true` only when the input is falsy
 *
 * @example
 * const a = ref(true);
 * const notA = logicNot(a);
 * // notA.value === false
 *
 * @example
 * const isLoading = ref(false);
 * const isReady = logicNot(isLoading);
 * // isReady.value === true
 *
 * @since 0.0.15
 */
export function logicNot(v: MaybeRefOrGetter<unknown>): LogicNotReturn {
  return computed(() => !toValue(v));
}

/**
 * Alias for {@link logicNot}.
 *
 * @since 0.0.15
 */
export const not: typeof logicNot = logicNot;
