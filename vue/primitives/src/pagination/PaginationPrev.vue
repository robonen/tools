<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A button that moves to the previous page. Renders as a `<button>`, is
 * automatically disabled on the first page (or while the pagination is
 * disabled), and is labelled "Previous Page" for assistive technology.
 */
export interface PaginationPrevProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { injectPaginationContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' as const } = defineProps<PaginationPrevProps>();

const { forwardRef } = useForwardExpose();
const ctx = injectPaginationContext();

const disabled = computed(() => ctx.isFirstPage.value || ctx.disabled.value);

const attrs = computed(() => ({
  'aria-label': 'Previous Page',
  type: as === 'button' ? 'button' as const : undefined,
  disabled: disabled.value,
}));

function handleClick() {
  if (!disabled.value) {
    ctx.onPageChange(ctx.currentPage.value - 1);
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
    <slot>Prev page</slot>
  </Primitive>
</template>
