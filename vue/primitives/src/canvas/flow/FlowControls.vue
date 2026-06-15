<script lang="ts">
import type { FlowPanelPosition } from './FlowPanel.vue';

/**
 * Zoom-in / zoom-out / fit-view button cluster, hosted in a `FlowPanel`. Headless
 * — every button is unstyled with a `data-flow-control` hook and an overridable
 * icon slot (`#zoom-in`, `#zoom-out`, `#fit-view`); add more buttons via the
 * default slot. Drives the canvas through `useFlow`.
 */
export interface FlowControlsProps {
  /** Panel anchor. @default 'bottom-left' */
  position?: FlowPanelPosition;
  /** Accessible group label. @default 'Flow controls' */
  ariaLabel?: string;
}
</script>

<script setup lang="ts">
import FlowPanel from './FlowPanel.vue';
import { useFlow } from './composables/useFlow';

const { position = 'bottom-left', ariaLabel = 'Flow controls' } = defineProps<FlowControlsProps>();
const api = useFlow();
</script>

<template>
  <FlowPanel
    :position="position"
    data-flow-controls=""
    role="group"
    :aria-label="ariaLabel"
  >
    <button
      type="button"
      data-flow-control="zoom-in"
      aria-label="Zoom in"
      @click="api.zoomIn()"
    >
      <slot name="zoom-in">+</slot>
    </button>
    <button
      type="button"
      data-flow-control="zoom-out"
      aria-label="Zoom out"
      @click="api.zoomOut()"
    >
      <slot name="zoom-out">−</slot>
    </button>
    <button
      type="button"
      data-flow-control="fit-view"
      aria-label="Fit view"
      @click="api.fitView()"
    >
      <slot name="fit-view">⊡</slot>
    </button>
    <slot />
  </FlowPanel>
</template>
