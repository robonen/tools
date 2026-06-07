<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ComboboxSeparatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';

const { as = 'div' } = defineProps<ComboboxSeparatorProps>();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="separator"
    aria-orientation="horizontal"
    aria-hidden="true"
  >
    <slot />
  </Primitive>
</template>
