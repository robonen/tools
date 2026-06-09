<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A button that jumps to the first page. Renders as a `<button>`, is
 * automatically disabled when already on the first page (or the pagination is
 * disabled), and is labelled "First Page" for assistive technology.
 */
export interface PaginationFirstProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { injectPaginationContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' as const } = defineProps<PaginationFirstProps>();

const { forwardRef } = useForwardExpose();
const ctx = injectPaginationContext();

const disabled = computed(() => ctx.isFirstPage.value || ctx.disabled.value);

const attrs = computed(() => ({
  'aria-label': 'First Page',
  type: as === 'button' ? 'button' as const : undefined,
  disabled: disabled.value,
}));

function handleClick() {
  if (!disabled.value) {
    ctx.onPageChange(1);
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
    <slot>First page</slot>
  </Primitive>
</template>
