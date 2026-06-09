<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A button that moves to the next page. Renders as a `<button>`, is
 * automatically disabled on the last page (or while the pagination is
 * disabled), and is labelled "Next Page" for assistive technology.
 */
export interface PaginationNextProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { injectPaginationContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' as const } = defineProps<PaginationNextProps>();

const { forwardRef } = useForwardExpose();
const ctx = injectPaginationContext();

const disabled = computed(() => ctx.isLastPage.value || ctx.disabled.value);

const attrs = computed(() => ({
  'aria-label': 'Next Page',
  type: as === 'button' ? 'button' as const : undefined,
  disabled: disabled.value,
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
