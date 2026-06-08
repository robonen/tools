import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type LogicOrSource = MaybeRefOrGetter<unknown>;

/**
 * @name logicOr
 * @category Math
 * @description Reactively compute the logical `OR` across a list of boolean
 * sources (each a ref, getter, or raw value). Returns a `ComputedRef<boolean>`
 * that is `true` when at least one source is truthy. Short-circuits on the first
 * truthy source, so later refs are only read when needed. With no arguments the
 * result is `false` (the identity for `OR`). Fully SSR-safe — touches no globals.
 *
 * @param {...MaybeRefOrGetter<unknown>} args The boolean sources to combine
 * @returns {ComputedRef<boolean>} A computed ref that is `true` when any source is truthy
 *
 * @example
 * const a = ref(false);
 * const b = ref(true);
 * const either = logicOr(a, b); // true
 *
 * @example
 * const valid = ref(false);
 * const result = logicOr(valid, () => Date.now() > 0); // true
 *
 * @since 0.0.15
 */
export function logicOr(...args: LogicOrSource[]): ComputedRef<boolean> {
  return computed<boolean>(() => {
    // Manual loop short-circuits on the first truthy source without allocating
    // a closure per evaluation the way Array.prototype.some would.
    for (const arg of args)
      if (toValue(arg)) return true;

    return false;
  });
}

/**
 * @name or
 * @category Math
 * @description Alias for {@link logicOr}. Reactively computes the logical `OR`
 * across boolean refs, getters, or raw values.
 *
 * @param {...MaybeRefOrGetter<unknown>} args The boolean sources to combine
 * @returns {ComputedRef<boolean>} A computed ref that is `true` when any source is truthy
 *
 * @example
 * const result = or(a, b);
 *
 * @since 0.0.15
 */
export const or: typeof logicOr = logicOr;
