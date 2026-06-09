<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A non-interactive placeholder shown where page links are collapsed into a
 * gap. Render one for each ellipsis entry in the list's `items`; defaults to an
 * ellipsis character but accepts custom content via the default slot.
 */
export interface PaginationEllipsisProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';

const { as = 'span' as const } = defineProps<PaginationEllipsisProps>();

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as
    data-type="ellipsis"
  >
    <slot>&#8230;</slot>
  </Primitive>
</template>
