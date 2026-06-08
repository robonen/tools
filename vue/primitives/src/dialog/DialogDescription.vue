<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface DialogDescriptionProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { onBeforeUnmount, onMounted } from 'vue';
import { useDialogContext } from './context';
import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';

const { as = 'p' } = defineProps<DialogDescriptionProps>();
const { forwardRef } = useForwardExpose();
const ctx = useDialogContext();

const id = useId(undefined, 'dialog-description');

onMounted(() => {
  ctx.descriptionId.value = id.value;
});
onBeforeUnmount(() => {
  if (ctx.descriptionId.value === id.value) ctx.descriptionId.value = undefined;
});
</script>

<template>
  <Primitive :ref="forwardRef" :id="id" :as="as">
    <slot />
  </Primitive>
</template>
