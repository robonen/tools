<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface LabelProps extends PrimitiveProps {
  /** The id of the element the label is associated with (renders as `for`). */
  for?: string;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';

useForwardExpose();

const { as = 'label', for: htmlFor } = defineProps<LabelProps>();

function onMouseDown(event: MouseEvent) {
  // Prevent text selection when double-clicking a label.
  if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
}
</script>

<template>
  <Primitive :as="as" :for="htmlFor" @mousedown="onMouseDown">
    <slot />
  </Primitive>
</template>
