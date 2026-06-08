import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { computed, toValue, useId as vueUseId } from 'vue';

/**
 * @name useId
 * @category State
 * @description SSR-safe unique identifier. Thin wrapper around Vue 3.5's built-in `useId()`
 * that accepts an optional prefix and allows callers to pass a pre-existing id
 * (useful for primitives that accept a user-supplied `id` prop).
 *
 * @param {MaybeRefOrGetter<string | undefined>} [deterministic] Existing id to return if provided
 * @param {string} [prefix='robonen'] Prefix appended before the generated id (ignored when `deterministic` is set)
 * @returns {ComputedRef<string>} A stable, SSR-safe id that matches between server and client
 *
 * @example
 * const id = useId();
 * // => 'robonen-v-1'
 *
 * @example
 * const id = useId(() => props.id, 'dialog');
 * // => props.id ?? 'dialog-v-1'
 *
 * @since 0.0.14
 */
export function useId(
  deterministic?: MaybeRefOrGetter<string | undefined>,
  prefix = 'robonen',
): ComputedRef<string> {
  const generated = vueUseId();

  return computed(() => toValue(deterministic) || `${prefix}-${generated}`);
}
