<script lang="ts">
import type { PopperContentEmits, PopperContentProps } from '../popper';

/**
 * The `'popper'` positioning strategy for the content panel: builds on
 * `PopperContent` for collision-aware floating placement with `side`, `align`,
 * and offset controls. Chosen internally by `SelectContentImpl` when `position`
 * is `'popper'`.
 */
export type SelectPopperPositionProps = PopperContentProps;
export type SelectPopperPositionEmits = PopperContentEmits;
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { PopperContent } from '../popper';

const props = defineProps<SelectPopperPositionProps>();
const emit = defineEmits<SelectPopperPositionEmits>();

const { forwardRef } = useForwardExpose();
</script>

<template>
  <PopperContent
    :ref="forwardRef"
    v-bind="props"
    :side="props.side ?? 'bottom'"
    :side-offset="props.sideOffset ?? 4"
    :align="props.align ?? 'start'"
    :style="{
      '--primitives-select-content-available-width': 'var(--popper-available-width)',
      '--primitives-select-content-available-height': 'var(--popper-available-height)',
      '--primitives-select-content-transform-origin': 'var(--popper-transform-origin)',
    }"
    @placed="emit('placed')"
  >
    <slot />
  </PopperContent>
</template>
