<script lang="ts">
import type { PrimitiveProps } from '@/primitive';

export interface PaginationLastProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '@/primitive';
import { computed } from 'vue';
import { injectPaginationContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' as const } = defineProps<PaginationLastProps>();

const { forwardRef } = useForwardExpose();
const ctx = injectPaginationContext();

const disabled = computed(() => ctx.isLastPage.value || ctx.disabled.value);

const attrs = computed(() => ({
  'aria-label': 'Last Page',
  type: as === 'button' ? 'button' as const : undefined,
  disabled: disabled.value,
}));

function handleClick() {
  if (!disabled.value) {
    ctx.onPageChange(ctx.totalPages.value);
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as
    v-bind="attrs"
    @click="handleClick"
  >
    <slot>Last page</slot>
  </Primitive>
</template>
