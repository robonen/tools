import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { useConfig } from './context';

/**
 * Primitives-local `useId` that routes through the active `ConfigContext`.
 * Falls back to the toolkit's default implementation when no override is
 * configured via `provideConfig({ useId })`.
 *
 * Signature matches `@robonen/vue`'s `useId`: `(deterministic?, prefix?)`.
 */
export function useId(
  deterministic?: MaybeRefOrGetter<string | undefined>,
  prefix?: string,
): ComputedRef<string> {
  return useConfig().useId(deterministic, prefix);
}
