<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The toast's heading. Renders the short, prominent line that names the
 * notification, placed inside a `ToastRoot`.
 */
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
