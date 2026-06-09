<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A visual divider between groups or items in the content. Renders as a
 * horizontal `role="separator"` and is purely decorative.
 */
export interface SelectSeparatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';

const { as = 'div' } = defineProps<SelectSeparatorProps>();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="separator"
    aria-orientation="horizontal"
  >
    <slot />
  </Primitive>
</template>
