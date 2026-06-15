<script lang="ts">
import type { CSSProperties } from 'vue';
import type { PrimitiveProps } from '../../internal/primitive';

export type FlowPanelPosition
  = | 'top-left' | 'top-center' | 'top-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

/**
 * An absolutely-positioned overlay anchored to a corner/edge of the pane, for
 * chrome like controls, legends, or toolbars. Stops pointer/wheel events from
 * reaching the pane, so interacting with the panel never pans or zooms. Place
 * inside `FlowRoot`'s default slot.
 */
export interface FlowPanelProps extends PrimitiveProps {
  /** Anchor position within the pane. @default 'top-left' */
  position?: FlowPanelPosition;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';

const { position = 'top-left', as = 'div' } = defineProps<FlowPanelProps>();
const { forwardRef } = useForwardExpose();

const style = computed<CSSProperties>(() => {
  const [v, h] = position.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right'];
  const s: CSSProperties = { position: 'absolute', pointerEvents: 'all' };
  s[v] = '0';
  if (h === 'center') {
    s.left = '50%';
    s.transform = 'translateX(-50%)';
  }
  else {
    s[h] = '0';
  }
  return s;
});

function stop(event: Event): void {
  event.stopPropagation();
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    data-flow-panel=""
    :data-position="position"
    :style="style"
    @pointerdown="stop"
    @wheel="stop"
  >
    <slot />
  </Primitive>
</template>
