<script lang="ts">
import type { PrimitiveProps } from '@/primitive';

export interface PaginationEllipsisProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '@/primitive';

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
