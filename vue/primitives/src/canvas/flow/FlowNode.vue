<script lang="ts">
import type { Component } from 'vue';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * One node. Reads only its own entry from `nodeLookup` (computed by id) so
 * moving another node never re-renders it; `v-memo` short-circuits patches when
 * its position/size/selection are unchanged. Positions itself with a plain
 * `translate` in flow space (the viewport applies zoom), measures itself once
 * via a ResizeObserver, wires drag, and provides `FlowNodeContext` to handles /
 * resizer / toolbar. Resolves its renderer from `#node-<type>` slot →
 * `nodeTypes[type]` → `#node` slot.
 */
export interface FlowNodeProps extends PrimitiveProps {
  /** Node id; matches the render key. */
  id: string;
  /** Component map keyed by `node.type` (forwarded from the renderer). */
  nodeTypes?: Record<string, Component>;
}
</script>

<script setup lang="ts">
import { computed, nextTick, useSlots, watch } from 'vue';
import { useForwardExpose, useResizeObserver } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { provideFlowNodeContext, useFlowContext } from './context';
import type { FlowNodeContext, HandleRegistration } from './context';
import type { HandleType } from './types';
import { useNodeDrag } from './composables/useNodeDrag';
import { getHandleBoundsFromDom } from './utils';

const { id, nodeTypes, as = 'div' } = defineProps<FlowNodeProps>();

const ctx = useFlowContext();
const slots = useSlots();
const { forwardRef, currentElement } = useForwardExpose();

const node = computed(() => ctx.nodeLookup.value.get(id));
const selected = computed(() => ctx.selection.value.nodes.has(id));
const dragging = computed(() => node.value?.dragging ?? false);
const positionAbsolute = computed(() => node.value?.positionAbsolute ?? { x: 0, y: 0 });
const measured = computed(() => node.value?.measured ?? { width: 0, height: 0 });
const connectable = computed(() => ctx.nodesConnectable.value && node.value?.connectable !== false);
const selectable = computed(() => ctx.elementsSelectable.value && node.value?.selectable !== false);

// Position by the ABSOLUTE flow point (parent chain summed) so subflow children
// land inside their parent even though all nodes are flat siblings in the DOM.
const transform = computed(() => `translate(${positionAbsolute.value.x}px, ${positionAbsolute.value.y}px)`);
const zIndex = computed(() => node.value?.zIndex ?? (selected.value || dragging.value ? 1000 : 0));

const resolvedType = computed(() => node.value?.type ?? 'default');
const slotName = computed(() => {
  const key = `node-${resolvedType.value}`;
  if (slots[key]) return key;
  if (slots['node']) return 'node';
  return null;
});
const TypeComponent = computed(() => nodeTypes?.[resolvedType.value]);

const slotProps = computed(() => ({
  id,
  type: resolvedType.value,
  data: node.value?.data,
  selected: selected.value,
  dragging: dragging.value,
  connectable: connectable.value,
  positionAbsolute: positionAbsolute.value,
  width: measured.value.width,
  height: measured.value.height,
  sourcePosition: node.value?.sourcePosition,
  targetPosition: node.value?.targetPosition,
}));

// ── measurement ──────────────────────────────────────────────────────────
function measure(): void {
  const el = currentElement.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const zoom = ctx.viewport.value.zoom || 1;
  // getBoundingClientRect returns the *scaled* box under the viewport's CSS
  // scale; dividing by zoom recovers zoom-independent flow-space geometry.
  ctx.setNodeMeasured(id, { width: rect.width / zoom, height: rect.height / zoom }, getHandleBoundsFromDom(el, zoom));
}

useResizeObserver(currentElement, () => measure());
watch(currentElement, (el) => {
  if (el) nextTick(measure);
}, { immediate: true });

// ── drag + selection ──────────────────────────────────────────────────────
useNodeDrag(currentElement, ctx, () => id);

function onPointerdown(event: PointerEvent): void {
  if (event.button !== 0 || !selectable.value) return;
  const additive = event.shiftKey || event.metaKey || event.ctrlKey;
  if (!selected.value || additive) ctx.selectNode(id, additive);
}

// ── node sub-context (handles re-trigger measurement when they mount) ───────
const handleIds = new Set<string>();
function registerHandle(reg: HandleRegistration): void {
  handleIds.add(`${reg.type}:${reg.id ?? ''}`);
  nextTick(measure);
}
function unregisterHandle(handleId: string | null, type: HandleType): void {
  handleIds.delete(`${type}:${handleId ?? ''}`);
  nextTick(measure);
}

const nodeContext: FlowNodeContext = {
  nodeId: id,
  node,
  positionAbsolute,
  measured,
  selected,
  dragging,
  connectable,
  nodeRef: currentElement,
  registerHandle,
  unregisterHandle,
};
provideFlowNodeContext(nodeContext);
</script>

<template>
  <Primitive
    v-memo="[positionAbsolute.x, positionAbsolute.y, selected, dragging, connectable, measured.width, measured.height, resolvedType, node?.data, node?.width, node?.height]"
    :ref="forwardRef"
    :as="as"
    data-flow-node=""
    :data-id="id"
    :data-selected="selected ? '' : undefined"
    :data-dragging="dragging ? '' : undefined"
    :data-selectable="selectable ? '' : undefined"
    :data-connectable="connectable ? '' : undefined"
    :data-type="resolvedType"
    :tabindex="ctx.disableKeyboardA11y.value ? undefined : 0"
    :aria-label="node?.ariaLabel"
    :style="{
      position: 'absolute',
      top: '0',
      left: '0',
      transform,
      zIndex,
      width: node?.width ? `${node.width}px` : undefined,
      height: node?.height ? `${node.height}px` : undefined,
      willChange: dragging ? 'transform' : undefined,
      pointerEvents: ctx.interactive.value ? undefined : 'none',
    }"
    @pointerdown="onPointerdown"
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
    <slot
      v-else
      name="node-default"
      v-bind="slotProps"
    />
  </Primitive>
</template>
