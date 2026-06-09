<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A button that closes the dialog when activated. Place inside Content for an
 * explicit dismiss control (e.g. an "X" in the corner or a "Cancel" button).
 */
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
