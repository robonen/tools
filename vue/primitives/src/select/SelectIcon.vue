<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface SelectIconProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';

const { as = 'span' } = defineProps<SelectIconProps>();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
  >
    <slot>▼</slot>
  </Primitive>
</template>
