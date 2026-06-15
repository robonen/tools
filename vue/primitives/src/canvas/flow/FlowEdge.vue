<script lang="ts">
import type { CSSProperties, Component } from 'vue';

/**
 * One edge. Reads only its own entry from `edgeLookup`, resolves endpoints from
 * the source/target nodes' measured handle bounds (falling back to side
 * centres), picks the path builder by `edge.type`, and memoizes the `d` string.
 * Renders a visible path plus a transparent fat interaction path for hit-testing
 * (no JS hit math). Customise via `#edge-<type>` slot or the `edgeTypes` map; the
 * slot receives every path builder for full control.
 */
export interface FlowEdgeProps {
  /** Edge id; matches the render key. */
  id: string;
  /** Component map keyed by `edge.type` (forwarded from the renderer). */
  edgeTypes?: Record<string, Component>;
}
</script>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { useFlowContext } from './context';
import type { EdgeMarkerType } from './types';
import type { PathResult } from './edge-paths';
import { getBezierPath, getMarkerId, getSmoothStepPath, getStepPath, getStraightPath } from './edge-paths';
import { findHandle, getAbsoluteHandlePoint, getDefaultEndpoint } from './utils';

const { id, edgeTypes } = defineProps<FlowEdgeProps>();

const ctx = useFlowContext();
const slots = useSlots();

const edge = computed(() => ctx.edgeLookup.value.get(id));
const sourceNode = computed(() => (edge.value ? ctx.nodeLookup.value.get(edge.value.source) : undefined));
const targetNode = computed(() => (edge.value ? ctx.nodeLookup.value.get(edge.value.target) : undefined));
const selected = computed(() => ctx.selection.value.edges.has(id));
const resolvedType = computed(() => edge.value?.type ?? 'default');

const endpoints = computed(() => {
  const e = edge.value;
  const s = sourceNode.value;
  const t = targetNode.value;
  if (!e || !s || !t) return null;

  const sHandle = findHandle(s, 'source', e.sourceHandle);
  const tHandle = findHandle(t, 'target', e.targetHandle);
  const sPos = sHandle?.position ?? s.sourcePosition ?? 'bottom';
  const tPos = tHandle?.position ?? t.targetPosition ?? 'top';
  const sp = sHandle ? getAbsoluteHandlePoint(s.positionAbsolute, sHandle) : getDefaultEndpoint(s, sPos);
  const tp = tHandle ? getAbsoluteHandlePoint(t.positionAbsolute, tHandle) : getDefaultEndpoint(t, tPos);
  return { sp, tp, sPos, tPos };
});

const path = computed<PathResult>(() => {
  const ep = endpoints.value;
  if (!ep) return ['', 0, 0, 0, 0];
  const params = {
    sourceX: ep.sp.x,
    sourceY: ep.sp.y,
    sourcePosition: ep.sPos,
    targetX: ep.tp.x,
    targetY: ep.tp.y,
    targetPosition: ep.tPos,
  };
  switch (resolvedType.value) {
    case 'straight': return getStraightPath(params);
    case 'step': return getStepPath(params);
    case 'smoothstep': return getSmoothStepPath(params);
    default: return getBezierPath(params);
  }
});

const slotName = computed(() => {
  const key = `edge-${resolvedType.value}`;
  if (slots[key]) return key;
  if (slots['edge']) return 'edge';
  return null;
});
const TypeComponent = computed(() => edgeTypes?.[resolvedType.value]);

const slotProps = computed(() => {
  const ep = endpoints.value;
  const e = edge.value;
  const [d, labelX, labelY] = path.value;
  return {
    id,
    source: e?.source,
    target: e?.target,
    sourceX: ep?.sp.x ?? 0,
    sourceY: ep?.sp.y ?? 0,
    targetX: ep?.tp.x ?? 0,
    targetY: ep?.tp.y ?? 0,
    sourcePosition: ep?.sPos,
    targetPosition: ep?.tPos,
    selected: selected.value,
    animated: e?.animated ?? false,
    data: e?.data,
    label: e?.label,
    markerStart: e?.markerStart,
    markerEnd: e?.markerEnd,
    markerStartUrl: markerStartRef.value,
    markerEndUrl: markerEndRef.value,
    path: d,
    labelX,
    labelY,
    getBezierPath,
    getSmoothStepPath,
    getStraightPath,
    getStepPath,
  };
});

function markerRef(marker: EdgeMarkerType | undefined): string | undefined {
  if (!marker) return undefined;
  if (typeof marker === 'string') return marker.startsWith('url(') ? marker : `url(#${marker})`;
  return `url(#${getMarkerId(marker, ctx.flowId)})`;
}
const markerStartRef = computed(() => markerRef(edge.value?.markerStart));
const markerEndRef = computed(() => markerRef(edge.value?.markerEnd));

// Stable style objects (avoid allocating a fresh object on every edge render,
// which happens for incident edges on every pan/node-drag frame).
const visiblePathStyle = { pointerEvents: 'none' } as const;
// Only two outcomes exist (selectable vs not), so select between two frozen
// constants instead of allocating a fresh { pointerEvents, cursor } object each
// time edge.value identity changes (every drag/pan frame for incident edges).
const INTERACTION_STROKE = { pointerEvents: 'stroke', cursor: 'pointer' } as const;
const INTERACTION_NONE = { pointerEvents: 'none', cursor: 'pointer' } as const;
const interactionPathStyle = computed<CSSProperties>(() =>
  edge.value?.selectable === false ? INTERACTION_NONE : INTERACTION_STROKE,
);

function onPointerdown(event: PointerEvent): void {
  if (event.button !== 0 || edge.value?.selectable === false || !ctx.elementsSelectable.value) return;
  event.stopPropagation();
  ctx.selectEdge(id, event.shiftKey || event.metaKey || event.ctrlKey);
}
</script>

<template>
  <g
    v-if="endpoints"
    v-memo="[path[0], selected, edge?.animated, edge?.selectable, edge?.data, markerStartRef, markerEndRef]"
    data-flow-edge=""
    :data-id="id"
    :data-type="resolvedType"
    :data-selected="selected ? '' : undefined"
    :data-animated="edge?.animated ? '' : undefined"
  >
    <slot
      v-if="slotName"
      :name="slotName"
      v-bind="slotProps"
    />
    <component
      :is="TypeComponent"
      v-else-if="TypeComponent"
      v-bind="slotProps"
    />
    <template v-else>
      <path
        :d="path[0]"
        data-flow-edge-path=""
        fill="none"
        stroke="currentColor"
        :stroke-width="1"
        :marker-start="markerStartRef"
        :marker-end="markerEndRef"
        :style="visiblePathStyle"
      />
      <path
        :d="path[0]"
        fill="none"
        stroke="transparent"
        :stroke-width="20"
        :style="interactionPathStyle"
        @pointerdown="onPointerdown"
      />
    </template>
  </g>
</template>
