<script lang="ts">
import type { Component } from 'vue';

/**
 * Iterates the visible node ids and renders one `FlowNode` per id, keyed by id
 * so virtualization re-inclusion patches in place. Forwards the `#node-<type>`
 * slots and the `nodeTypes` component map down to each node. Renderless (returns
 * a fragment of nodes directly into the viewport — no wrapper element).
 */
export interface FlowNodeRendererProps {
  nodeTypes?: Record<string, Component>;
}
</script>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { useFlowContext } from './context';
import FlowNode from './FlowNode.vue';

defineProps<FlowNodeRendererProps>();
defineOptions({ inheritAttrs: false });

const ctx = useFlowContext();
const slots = useSlots();
// Stable name list (mirrors FlowRoot) — avoids new dynamic-slot identities per render.
const slotNames = computed(() => Object.keys(slots));
</script>

<template>
  <FlowNode
    v-for="id in ctx.visibleNodeIds.value"
    :id="id"
    :key="id"
    :node-types="nodeTypes"
  >
    <template
      v-for="name in slotNames"
      :key="name"
      #[name]="sp"
    >
      <slot
        :name="name"
        v-bind="sp ?? {}"
      />
    </template>
  </FlowNode>
</template>
