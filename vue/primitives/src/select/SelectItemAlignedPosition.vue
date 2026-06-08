<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface SelectItemAlignedPositionProps extends PrimitiveProps {
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
