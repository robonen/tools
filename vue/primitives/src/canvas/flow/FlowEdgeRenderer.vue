<script lang="ts">
import type { Component } from 'vue';

/**
 * The single shared `<svg>` for all edges, living inside the viewport transform
 * so edge coordinates are plain flow-space numbers. `overflow:visible` lets
 * paths draw outside the nominal box; `pointer-events:none` here, re-enabled per
 * edge on the fat interaction path. Markers are deduped into one `<defs>`.
 * Rendered under the nodes (earlier in DOM) so nodes paint on top.
 */
export interface FlowEdgeRendererProps {
  edgeTypes?: Record<string, Component>;
}
</script>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { useFlowContext } from './context';
import type { EdgeMarker } from './types';
import { getMarkerId } from './edge-paths';
import FlowEdge from './FlowEdge.vue';
import FlowConnectionLine from './FlowConnectionLine.vue';

defineProps<FlowEdgeRendererProps>();
defineOptions({ inheritAttrs: false });

const ctx = useFlowContext();
const slots = useSlots();
// Stable name list — avoids new dynamic-slot identities per render.
const edgeSlotNames = computed(() => Object.keys(slots).filter(n => n !== 'defs' && n !== 'connection-line'));

/** Deduped set of object markers across all edges, rendered once in `<defs>`. */
const markers = computed(() => {
  const map = new Map<string, EdgeMarker>();
  for (const edge of ctx.edgeLookup.value.values()) {
    for (const marker of [edge.markerStart, edge.markerEnd]) {
      if (marker && typeof marker === 'object') {
        const mid = getMarkerId(marker, ctx.flowId);
        if (!map.has(mid)) map.set(mid, marker);
      }
    }
  }
  return [...map.entries()].map(([id, marker]) => ({ id, marker }));
});
</script>

<template>
  <svg
    data-flow-edges=""
    :style="{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }"
  >
    <defs>
      <marker
        v-for="{ id, marker } in markers"
        :id="id"
        :key="id"
        viewBox="-10 -10 20 20"
        :markerWidth="marker.width ?? 12"
        :markerHeight="marker.height ?? 12"
        :markerUnits="marker.markerUnits ?? 'strokeWidth'"
        :orient="marker.orient ?? 'auto-start-reverse'"
        refX="0"
        refY="0"
      >
        <polyline
          :stroke="marker.color ?? 'currentColor'"
          :fill="marker.type === 'arrowclosed' ? (marker.color ?? 'currentColor') : 'none'"
          :stroke-width="marker.strokeWidth ?? 1"
          stroke-linecap="round"
          stroke-linejoin="round"
          :points="marker.type === 'arrowclosed' ? '-5,-4 0,0 -5,4 -5,-4' : '-5,-4 0,0 -5,4'"
        />
      </marker>
      <slot name="defs" />
    </defs>

    <FlowEdge
      v-for="id in ctx.visibleEdgeIds.value"
      :id="id"
      :key="id"
      :edge-types="edgeTypes"
    >
      <template
        v-for="name in edgeSlotNames"
        :key="name"
        #[name]="sp"
      >
        <slot
          :name="name"
          v-bind="sp ?? {}"
        />
      </template>
    </FlowEdge>

    <FlowConnectionLine>
      <template
        v-if="$slots['connection-line']"
        #default="sp"
      >
        <slot
          name="connection-line"
          v-bind="sp ?? {}"
        />
      </template>
    </FlowConnectionLine>
  </svg>
</template>
