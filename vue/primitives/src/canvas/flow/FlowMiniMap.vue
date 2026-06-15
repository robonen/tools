<script lang="ts">
import type { FlowPanelPosition } from './FlowPanel.vue';

/**
 * A scaled overview of the graph with a viewport indicator. Auto-frames all
 * nodes plus the current viewport, draws a `<rect>` per node, and (when
 * `pannable`) recenters the viewport on click. Node rects expose `data-id` /
 * `data-selected` for styling; size and colour are the consumer's.
 */
export interface FlowMiniMapProps {
  /** Panel anchor. @default 'bottom-right' */
  position?: FlowPanelPosition;
  /** Map width in px. @default 200 */
  width?: number;
  /** Map height in px. @default 150 */
  height?: number;
  /** Click the map to recenter the viewport. @default true */
  pannable?: boolean;
  /** Accessible label. @default 'Mini map' */
  ariaLabel?: string;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import FlowPanel from './FlowPanel.vue';
import { useFlowContext } from './context';
import { getNodesBounds, visibleFlowRect } from './utils';

const {
  position = 'bottom-right',
  width = 200,
  height = 150,
  pannable = true,
  ariaLabel = 'Mini map',
} = defineProps<FlowMiniMapProps>();

const ctx = useFlowContext();
const { forwardRef, currentElement } = useForwardExpose();

const nodes = computed(() => [...ctx.nodeLookup.value.values()].filter(n => !n.hidden));
const viewRect = computed(() => visibleFlowRect(ctx.viewport.value, ctx.paneRect.value, 0));

const bounds = computed(() => {
  const b = getNodesBounds(nodes.value);
  const v = viewRect.value;
  const x1 = Math.min(b.x, v.x);
  const y1 = Math.min(b.y, v.y);
  const x2 = Math.max(b.x + b.width, v.x + v.width);
  const y2 = Math.max(b.y + b.height, v.y + v.height);
  const w = x2 - x1 || 1;
  const h = y2 - y1 || 1;
  const pad = Math.max(w, h) * 0.1;
  return { x: x1 - pad, y: y1 - pad, width: w + 2 * pad, height: h + 2 * pad };
});

const viewBox = computed(() => `${bounds.value.x} ${bounds.value.y} ${bounds.value.width} ${bounds.value.height}`);
const maskStroke = computed(() => (bounds.value.width / width) * 1.5);

function onPointerdown(event: PointerEvent): void {
  if (!pannable) return;
  const el = currentElement.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const fx = bounds.value.x + ((event.clientX - r.left) / r.width) * bounds.value.width;
  const fy = bounds.value.y + ((event.clientY - r.top) / r.height) * bounds.value.height;
  const vp = ctx.viewport.value;
  const pane = ctx.paneRect.value;
  ctx.viewport.value = { zoom: vp.zoom, x: pane.width / 2 - fx * vp.zoom, y: pane.height / 2 - fy * vp.zoom };
}
</script>

<template>
  <FlowPanel :position="position">
    <svg
      :ref="forwardRef"
      data-flow-minimap=""
      role="img"
      :aria-label="ariaLabel"
      :width="width"
      :height="height"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      :style="{ cursor: pannable ? 'pointer' : undefined }"
      @pointerdown="onPointerdown"
    >
      <rect
        v-for="n in nodes"
        :key="n.id"
        v-memo="[n.positionAbsolute.x, n.positionAbsolute.y, n.measured.width, n.measured.height, ctx.selection.value.nodes.has(n.id)]"
        data-flow-minimap-node=""
        :data-id="n.id"
        :data-selected="ctx.selection.value.nodes.has(n.id) ? '' : undefined"
        :x="n.positionAbsolute.x"
        :y="n.positionAbsolute.y"
        :width="n.measured.width"
        :height="n.measured.height"
        fill="currentColor"
      />
      <rect
        data-flow-minimap-mask=""
        :x="viewRect.x"
        :y="viewRect.y"
        :width="viewRect.width"
        :height="viewRect.height"
        fill="none"
        stroke="currentColor"
        :stroke-width="maskStroke"
      />
    </svg>
  </FlowPanel>
</template>
