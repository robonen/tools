<script lang="ts">
import type { PrimitiveProps } from '../primitive';

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
