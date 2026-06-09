<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A button that dismisses the toast it lives in. Renders a button by default and
 * closes the parent `ToastRoot` via toast context on click.
 */
export interface ToastCloseProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';
import { useToastContext } from './context';

const { as = 'button' } = defineProps<ToastCloseProps>();
const { forwardRef } = useForwardExpose();
const toastCtx = useToastContext();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    data-primitives-toast-close
    @click="toastCtx.onClose()"
  >
    <slot />
  </Primitive>
</template>
