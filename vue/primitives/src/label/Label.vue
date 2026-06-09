<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A caption associated with a form control. Renders a native `<label>` and,
 * when `for` matches a control's id, lets clicks focus or toggle that control
 * while announcing the text to assistive technology. Double-click text
 * selection is suppressed so labels stay clickable. Use it to label inputs,
 * checkboxes, switches, and other custom controls.
 */
export interface LabelProps extends PrimitiveProps {
  /** The id of the element the label is associated with (renders as `for`). */
  for?: string;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';

const { forwardRef } = useForwardExpose();

const { as = 'label', for: htmlFor } = defineProps<LabelProps>();

function onMouseDown(event: MouseEvent) {
  // Prevent text selection when double-clicking a label.
  if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
}
</script>

<template>
  <Primitive :ref="forwardRef" :as="as" :for="htmlFor" @mousedown="onMouseDown">
    <slot />
  </Primitive>
</template>
