<script lang="ts">
import type { CSSProperties } from 'vue';
import type { PrimitiveProps } from '../../internal/primitive';
import type { HandleType, IsValidConnection, Position } from './types';

/**
 * A connection anchor placed inside a custom node. Registers itself with the
 * node sub-context (triggering a re-measure of handle geometry), positions
 * itself on the given side by default, and starts a connection on pointerdown.
 * The visual (size/colour) is the consumer's via `[data-flow-handle]`; only the
 * side positioning is applied inline. `data-handleid` / `data-handletype` /
 * `data-handlepos` drive measurement and styling hooks.
 */
export interface FlowHandleProps extends PrimitiveProps {
  /** Whether this handle starts (`source`) or ends (`target`) connections. */
  type: HandleType;
  /** Side of the node the handle sits on. */
  position: Position;
  /** Handle id; required when a node has multiple handles of one type. */
  id?: string | null;
  /** Per-handle connect enable (defaults to the node's `connectable`). */
  isConnectable?: boolean;
  /** Per-handle connection validator (composed with the global one). */
  isValidConnection?: IsValidConnection;
}

// Module-level: shared across every handle instance, never mutated (Vue style
// binding only reads). Avoids rebuilding a style object per render/per drag frame.
const BASE: CSSProperties = { position: 'absolute', transform: 'translate(-50%, -50%)', pointerEvents: 'all' };
const POSITION_STYLES: Record<Position, CSSProperties> = {
  top: { ...BASE, top: '0', left: '50%' },
  bottom: { ...BASE, top: '100%', left: '50%' },
  left: { ...BASE, top: '50%', left: '0' },
  right: { ...BASE, top: '50%', left: '100%' },
};
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useFlowContext, useFlowNodeContext } from './context';

// `isConnectable` MUST default to `undefined` (not via destructure default):
// Vue coerces an absent Boolean prop to `false`, which would defeat the
// `?? nodeCtx.connectable` fallback and make every handle non-connectable.
const props = withDefaults(defineProps<FlowHandleProps>(), {
  id: null,
  isConnectable: undefined,
  as: 'div',
});

const ctx = useFlowContext();
const nodeCtx = useFlowNodeContext();
const { forwardRef, currentElement } = useForwardExpose();

const connectable = computed(() => (props.isConnectable ?? nodeCtx.connectable.value) && ctx.nodesConnectable.value);

onMounted(() => {
  const el = currentElement.value;
  if (el) nodeCtx.registerHandle({ id: props.id, type: props.type, position: props.position, element: el });
});
onBeforeUnmount(() => nodeCtx.unregisterHandle(props.id, props.type));

function onPointerdown(event: PointerEvent): void {
  if (event.button !== 0 || !connectable.value || !ctx.interactive.value) return;
  // Don't let the node start dragging / the pane start panning.
  event.stopPropagation();
  const el = currentElement.value;
  if (!el) return;
  ctx.startConnection({ id: props.id, type: props.type, position: props.position, element: el }, nodeCtx.nodeId);
}

const positionStyle = computed(() => POSITION_STYLES[props.position]);
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="props.as"
    data-flow-handle=""
    :data-handleid="props.id ?? ''"
    :data-handletype="props.type"
    :data-handlepos="props.position"
    :data-connectable="connectable ? '' : undefined"
    :style="positionStyle"
    @pointerdown="onPointerdown"
  >
    <slot />
  </Primitive>
</template>
