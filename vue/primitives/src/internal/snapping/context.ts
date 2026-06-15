import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type { UseSnappingReturn } from './useSnapping';

/**
 * Shared snapping context a Root (e.g. `TimelineRoot`, `CropRoot`) provides so
 * every descendant handle drives the *same* engine — one source of truth for
 * locked targets, threshold, and the enable switch.
 */
export interface SnappingContext {
  /** The shared snap engine. */
  engine: UseSnappingReturn;
  /** Master enable switch, reactive and writable by the Root. */
  enabled: Ref<boolean>;
  /** Snap radius in pixels, reactive and writable by the Root. */
  thresholdPx: Ref<number>;
}

const ctx = useContextFactory<SnappingContext>('SnappingContext');

/**
 * Provide a {@link SnappingContext} to descendants. Call from a Root setup.
 */
export const provideSnappingContext = ctx.provide;

/**
 * Inject the shared {@link SnappingContext}. Unlike the strict factory default,
 * this returns `null` when no Root provided one — so a handle can run
 * standalone with its own {@link useSnapping} engine instead of throwing.
 */
export function useSnappingContext(): SnappingContext | null {
  // Passing an explicit `null` fallback makes the factory return it (instead of
  // throwing) when no provider exists upward in the tree.
  return ctx.inject(null as unknown as SnappingContext) ?? null;
}
