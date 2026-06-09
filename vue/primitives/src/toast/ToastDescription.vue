<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The toast's supporting text. Renders the longer description beneath the
 * `ToastTitle`, placed inside a `ToastRoot`.
 */
export interface ToastDescriptionProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';

const { as = 'div' } = defineProps<ToastDescriptionProps>();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    data-primitives-toast-description
  >
    <slot />
  </Primitive>
</template>
