import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';
import type { Direction } from './context';
import { useConfig } from './context';

/**
 * Resolves the effective reading direction: a per-component override wins over
 * the active `ConfigProvider` `dir`, falling back to `'ltr'`.
 *
 * Mirrors the `dir ?? config.dir.value` pattern used by primitive roots, as a
 * reusable composable.
 *
 * @param dir Optional per-component direction override.
 * @returns A computed `Direction` combining the override with the config.
 */
export function useDirection(
  dir?: MaybeRefOrGetter<Direction | undefined>,
): ComputedRef<Direction> {
  const config = useConfig();
  return computed(() => toValue(dir) ?? config.dir.value ?? 'ltr');
}
