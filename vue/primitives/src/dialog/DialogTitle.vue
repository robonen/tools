<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * An accessible title for the dialog. Its id is wired to the Content's
 * `aria-labelledby`, so render one inside every dialog (visually hide it if you
 * do not want it shown).
 */
export interface DialogTitleProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { onBeforeUnmount, onMounted } from 'vue';
import { useDialogContext } from './context';
import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';

const { as = 'h2' } = defineProps<DialogTitleProps>();
const { forwardRef } = useForwardExpose();
const ctx = useDialogContext();

const id = useId(undefined, 'dialog-title');

onMounted(() => {
  ctx.titleId.value = id.value;
});
onBeforeUnmount(() => {
  if (ctx.titleId.value === id.value) ctx.titleId.value = undefined;
});
</script>

<template>
  <Primitive :ref="forwardRef" :id="id" :as="as">
    <slot />
  </Primitive>
</template>
