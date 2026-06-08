<script lang="ts">
import type { PopperContentEmits, PopperContentProps } from '../popper';

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
    @placed="emit('placed')"
  >
    <slot />
  </PopperContent>
</template>
