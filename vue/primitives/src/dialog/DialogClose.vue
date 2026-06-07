<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface DialogCloseProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useDialogContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' } = defineProps<DialogCloseProps>();
const { forwardRef } = useForwardExpose();
const ctx = useDialogContext();
</script>

<template>
  <Primitive :ref="forwardRef" :as="as" type="button" @click="ctx.onClose">
    <slot />
  </Primitive>
</template>
