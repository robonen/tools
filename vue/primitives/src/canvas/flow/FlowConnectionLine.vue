<script lang="ts">
/**
 * Live preview path drawn while a connection is being dragged from a handle to
 * the pointer. Renders nothing when no connection is in progress. Only this
 * component (and the hovered handle) subscribes to `connection`, so dragging a
 * connection does not re-render nodes or committed edges. Override the visual via
 * the default slot.
 */
export type FlowConnectionLineProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useFlowContext } from './context';
import { getBezierPath } from './edge-paths';

const ctx = useFlowContext();
const connection = computed(() => ctx.connection.value);

const path = computed(() => {
  const c = connection.value;
  if (!c.inProgress || !c.fromPosition || !c.toPosition) return null;
  const [d] = getBezierPath({
    sourceX: c.fromPosition.x,
    sourceY: c.fromPosition.y,
    sourcePosition: c.fromHandle?.position ?? 'bottom',
    targetX: c.toPosition.x,
    targetY: c.toPosition.y,
    targetPosition: 'top',
  });
  return d;
});
</script>

<template>
  <g
    v-if="path"
    data-flow-connection-line=""
    :data-valid="connection.isValid === true ? '' : undefined"
    :data-invalid="connection.isValid === false ? '' : undefined"
  >
    <slot
      :from="connection.fromPosition"
      :to="connection.toPosition"
      :valid="connection.isValid"
      :path="path"
    >
      <path
        :d="path"
        fill="none"
        stroke="currentColor"
        :stroke-width="1"
        :style="{ pointerEvents: 'none' }"
      />
    </slot>
  </g>
</template>
