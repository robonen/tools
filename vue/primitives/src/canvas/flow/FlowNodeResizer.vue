<script lang="ts">
import type { CSSProperties } from 'vue';

/**
 * In-node resize handles (8 control points). Placed inside a custom node, it
 * resizes that node by writing explicit `width`/`height` (and `position` for
 * top/left edges, so the opposite edge stays fixed). Deltas are converted to
 * flow space (`/zoom`), clamped to min/max, and committed through `updateNode`.
 * Handles are unstyled — target `[data-flow-resize-handle][data-position]`.
 */
export interface FlowNodeResizerProps {
  /** Minimum width in flow units. @default 10 */
  minWidth?: number;
  /** Maximum width in flow units. @default Infinity */
  maxWidth?: number;
  /** Minimum height in flow units. @default 10 */
  minHeight?: number;
  /** Maximum height in flow units. @default Infinity */
  maxHeight?: number;
  /** Keep the node's aspect ratio while resizing. @default false */
  keepAspectRatio?: boolean;
}

interface Control {
  position: string;
  cursor: string;
  style: CSSProperties;
}
</script>

<script setup lang="ts">
import { onScopeDispose } from 'vue';
import { clamp } from '@robonen/stdlib';
import { useFlowContext, useFlowNodeContext } from './context';
import { capturePointer, releasePointer } from './composables/dom';

const {
  minWidth = 10,
  maxWidth = Number.POSITIVE_INFINITY,
  minHeight = 10,
  maxHeight = Number.POSITIVE_INFINITY,
  keepAspectRatio = false,
} = defineProps<FlowNodeResizerProps>();

const ctx = useFlowContext();
const nodeCtx = useFlowNodeContext();

const CONTROLS: Control[] = [
  { position: 'top-left', cursor: 'nwse-resize', style: { top: '0', left: '0' } },
  { position: 'top', cursor: 'ns-resize', style: { top: '0', left: '50%' } },
  { position: 'top-right', cursor: 'nesw-resize', style: { top: '0', left: '100%' } },
  { position: 'right', cursor: 'ew-resize', style: { top: '50%', left: '100%' } },
  { position: 'bottom-right', cursor: 'nwse-resize', style: { top: '100%', left: '100%' } },
  { position: 'bottom', cursor: 'ns-resize', style: { top: '100%', left: '50%' } },
  { position: 'bottom-left', cursor: 'nesw-resize', style: { top: '100%', left: '0' } },
  { position: 'left', cursor: 'ew-resize', style: { top: '50%', left: '0' } },
];

let pointerId = -1;
let activeEl: HTMLElement | undefined;
let control = '';
let startClientX = 0;
let startClientY = 0;
let startW = 0;
let startH = 0;
let startX = 0;
let startY = 0;
let lastEvent: PointerEvent | null = null;
let rafId: number | null = null;

function flush(): void {
  rafId = null;
  if (!lastEvent) return;
  const node = nodeCtx.node.value;
  if (!node) return;

  const zoom = ctx.viewport.value.zoom || 1;
  const dx = (lastEvent.clientX - startClientX) / zoom;
  const dy = (lastEvent.clientY - startClientY) / zoom;
  const ratio = startH === 0 ? 1 : startW / startH;

  let w = startW;
  let h = startH;
  if (control.includes('right')) w = startW + dx;
  if (control.includes('left')) w = startW - dx;
  if (control.includes('bottom')) h = startH + dy;
  if (control.includes('top')) h = startH - dy;

  w = clamp(w, minWidth, maxWidth);
  h = clamp(h, minHeight, maxHeight);
  if (keepAspectRatio) {
    if (control === 'left' || control === 'right') h = w / ratio;
    else if (control === 'top' || control === 'bottom') w = h * ratio;
    else h = w / ratio;
  }

  let x = startX;
  let y = startY;
  if (control.includes('left')) x = startX + (startW - w);
  if (control.includes('top')) y = startY + (startH - h);

  ctx.updateNode(node.id, { width: w, height: h, position: { x, y } });
}

function onMove(event: PointerEvent): void {
  if (event.pointerId !== pointerId) return;
  lastEvent = event;
  if (rafId === null) rafId = requestAnimationFrame(flush);
}

function onUp(event: PointerEvent): void {
  if (event.pointerId !== pointerId) return;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  flush();
  releasePointer(activeEl, event.pointerId);
  globalThis.removeEventListener?.('pointermove', onMove);
  globalThis.removeEventListener?.('pointerup', onUp);
  pointerId = -1;
  activeEl = undefined;
}

function onPointerdown(event: PointerEvent, c: Control): void {
  if (event.button !== 0 || !ctx.interactive.value) return;
  const node = nodeCtx.node.value;
  if (!node) return;
  event.stopPropagation();
  event.preventDefault();

  control = c.position;
  pointerId = event.pointerId;
  activeEl = event.currentTarget as HTMLElement;
  startClientX = event.clientX;
  startClientY = event.clientY;
  startW = node.measured.width;
  startH = node.measured.height;
  startX = node.position.x;
  startY = node.position.y;

  capturePointer(activeEl, event.pointerId);
  globalThis.addEventListener?.('pointermove', onMove);
  globalThis.addEventListener?.('pointerup', onUp);
}

onScopeDispose(() => {
  globalThis.removeEventListener?.('pointermove', onMove);
  globalThis.removeEventListener?.('pointerup', onUp);
});
</script>

<template>
  <div
    v-for="c in CONTROLS"
    :key="c.position"
    class="nodrag"
    data-flow-resize-handle=""
    :data-position="c.position"
    :style="{
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      cursor: c.cursor,
      touchAction: 'none',
      ...c.style,
    }"
    @pointerdown="onPointerdown($event, c)"
  >
    <slot
      :position="c.position"
    />
  </div>
</template>
