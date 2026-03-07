<script lang="ts">
import type { PrimitiveProps } from '@/primitive';

export interface PaginationNextProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '@/primitive';
import { injectPaginationContext } from './context';

const { as = 'button' as const } = defineProps<PaginationNextProps>();

const { forwardRef } = useForwardExpose();
const ctx = injectPaginationContext();

const disabled = computed(() => ctx.isLastPage.value || ctx.disabled.value);

const attrs = computed(() => ({
  'aria-label': 'Next Page',
  'type': as === 'button' ? 'button' as const : undefined,
  'disabled': disabled.value,
}));

function handleClick() {
  if (!disabled.value) {
    ctx.onPageChange(ctx.currentPage.value + 1);
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
    <slot>Next page</slot>
  </Primitive>
</template>
