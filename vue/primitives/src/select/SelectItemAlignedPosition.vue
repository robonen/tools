<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The `'item-aligned'` positioning strategy for the content panel: pins the
 * panel directly below the trigger, matching its left edge and minimum width.
 * Chosen internally by `SelectContentImpl` when `position` is `'item-aligned'`.
 */
export interface SelectItemAlignedPositionProps extends PrimitiveProps {
  /** Reading direction, forwarded from the root. */
  dir?: string;
}

export interface SelectItemAlignedPositionEmits {
  placed: [];
}
</script>

<script setup lang="ts">
import { onMounted } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useSelectContentContext, useSelectRootContext } from './context';

const { as = 'div' } = defineProps<SelectItemAlignedPositionProps>();
const emit = defineEmits<SelectItemAlignedPositionEmits>();

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useSelectRootContext();
const contentCtx = useSelectContentContext();

onMounted(() => {
  const trigger = rootCtx.triggerElement.value;
  const content = currentElement.value;
  if (!trigger || !content) {
    emit('placed');
    return;
  }

  const triggerRect = trigger.getBoundingClientRect();

  Object.assign(content.style, {
    position: 'fixed',
    top: `${triggerRect.bottom}px`,
    left: `${triggerRect.left}px`,
    minWidth: `${triggerRect.width}px`,
    zIndex: '50',
  });

  contentCtx.isPositioned.value = true;
  emit('placed');
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    data-primitives-select-content
  >
    <slot />
  </Primitive>
</template>
