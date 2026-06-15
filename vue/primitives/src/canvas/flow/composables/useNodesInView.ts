import type { ComputedRef } from 'vue';
import { computed } from 'vue';
import type { FlowContext } from '../context';
import type { Rect } from '../types';
import { visibleFlowRect } from '../utils';
import { getVisibleEdgeIds, getVisibleNodeIds } from '../virtualization';

export interface UseNodesInViewOptions {
  /** Extra px around the viewport kept "in view". @default 200 */
  buffer?: number;
}

export interface UseNodesInViewReturn {
  /** Flow-space rect currently visible (buffered). */
  visibleRect: ComputedRef<Rect>;
  /** Ids of nodes intersecting the visible rect. */
  visibleNodeIds: ComputedRef<string[]>;
  /** Ids of edges with an endpoint in view. */
  visibleEdgeIds: ComputedRef<string[]>;
}

/**
 * Reactive viewport culling for very large graphs. `FlowRoot` already culls
 * internally when `onlyRenderVisibleElements` is set; this composable exposes
 * the same computation to advanced consumers building custom renderers or
 * spatial overlays. Recomputes on pan/zoom — only enable where the node count
 * makes culling worth the per-frame cost.
 */
export function useNodesInView(ctx: FlowContext, options: UseNodesInViewOptions = {}): UseNodesInViewReturn {
  const buffer = options.buffer ?? 200;

  const visibleRect = computed(() => visibleFlowRect(ctx.viewport.value, ctx.paneRect.value, buffer));

  const visibleNodeIds = computed(() =>
    getVisibleNodeIds(ctx.nodeLookup.value.values(), ctx.nodeLookup.value, visibleRect.value));

  const visibleNodeSet = computed(() => new Set(visibleNodeIds.value));

  const visibleEdgeIds = computed(() =>
    getVisibleEdgeIds(ctx.edgeLookup.value.values(), visibleNodeSet.value));

  return { visibleRect, visibleNodeIds, visibleEdgeIds };
}
