<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ToastTitleProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';

const { as = 'div' } = defineProps<ToastTitleProps>();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    data-primitives-toast-title
  >
    <slot />
  </Primitive>
</template>
