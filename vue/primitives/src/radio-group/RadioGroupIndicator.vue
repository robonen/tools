<script lang="ts">
import type { PrimitiveProps } from '../primitive';
export interface RadioGroupIndicatorProps extends PrimitiveProps {
  forceMount?: boolean;

}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useRadioGroupItemContext } from './context';

const { as = 'span', forceMount = false } = defineProps<RadioGroupIndicatorProps>();
const { forwardRef } = useForwardExpose();
const item = useRadioGroupItemContext();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    v-if="forceMount || item.checked.value"
    :data-state="item.checked.value ? 'checked' : 'unchecked'"
    :data-disabled="item.disabled.value ? '' : undefined"
    style="pointer-events: none;"
  >
    <slot />
  </Primitive>
</template>
