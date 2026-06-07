<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface PopoverCloseProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { usePopoverContext } from './context';

const { as = 'button' } = defineProps<PopoverCloseProps>();
const { forwardRef } = useForwardExpose();
const ctx = usePopoverContext();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    @click="ctx.onOpenChange(false)"
  >
    <slot />
  </Primitive>
</template>
