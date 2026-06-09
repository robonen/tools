<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A single page link. Renders as a `<button>` that selects its `value` page on
 * click, marks itself with `aria-current="page"` and `data-selected` when it is
 * the current page, and is disabled while the pagination is disabled.
 */
export interface PaginationListItemProps extends PrimitiveProps {
  /** The page number this item navigates to. */
  value: number;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { injectPaginationContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' as const, value } = defineProps<PaginationListItemProps>();

const { forwardRef } = useForwardExpose();
const ctx = injectPaginationContext();

const isSelected = computed(() => ctx.currentPage.value === value);

const attrs = computed(() => ({
  'data-type': 'page',
  'aria-label': `Page ${value}`,
  'aria-current': isSelected.value ? 'page' as const : undefined,
  'data-selected': isSelected.value ? 'true' : undefined,
  disabled: ctx.disabled.value,
  type: as === 'button' ? 'button' as const : undefined,
}));

function handleClick() {
  if (!ctx.disabled.value) {
    ctx.onPageChange(value);
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
    <slot>{{ value }}</slot>
  </Primitive>
</template>
