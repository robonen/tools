import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';
import { useConfig } from './context';

/**
 * Resolves the effective CSP `nonce`: a per-component override wins over the
 * active `ConfigProvider` `nonce`. Lets style-injecting primitives inherit a
 * single app-wide nonce instead of being passed one manually.
 *
 * @param nonce Optional per-component nonce override.
 * @returns A computed nonce (or `undefined`) combining the override with config.
 */
export function useNonce(
  nonce?: MaybeRefOrGetter<string | undefined>,
): ComputedRef<string | undefined> {
  const config = useConfig();
  return computed(() => toValue(nonce) || config.nonce.value);
}
