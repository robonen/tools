<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The decorative icon shown in the trigger (a chevron by default). Marked
 * `aria-hidden`; override the default glyph by passing slot content.
 */
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
